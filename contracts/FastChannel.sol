
pragma solidity ^0.5.0;


/// openzeppelin imports
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

/// Fasttoken imports
import './Channel.sol';
import './BaseGame.sol';


/**
 * @title FastChannel
 * This is a fastchannel - Fasttoken's state channel implementation, created only once
 * per user, by provider contract and holds states as well as balances - 
 * withdrawals/deposits and can be updated whenever any of the parties either suspect
 * oponent or just wants to update the balance to withdraw.
 * Channel balance can be deposited directly and withdrawn only by approval of
 * blockchain channel and game logic based on opponent's signature.
 * Works along with fastchannel front end however can be called individually as well
 * 
 * Fasttoken:By BetConstruct
 */
contract FastChannel is Channel {
    
        using SafeMath for uint256;
        
        uint16 public constant VERSION = 1;   
        address public signerAddr;
        int256 public lastBalanceChange; 
        uint256 private constant FRZ_HRS = 2 hours; //Default is 2 hours, overwrite for new channel types
        uint256 public timeOfWithdrawReq; 
        uint256 public frozenWithdrawal;
        uint32 public nonce = 0;
        GameStates public lastState;

        struct GameStates {
            
                address gameAddr;
                uint256[] state;
                uint256[] rand1;
                uint256[] rand2;
                bytes32 rand1Sha;
        }

        constructor(address _casino, address _player, Fasttoken _token) public {

                token = _token;
                player = _player;
                casino = Casino(_casino);
        }

        function getLastState() public
                                view
                                returns (address gameAddress,
                                         uint256[] memory state,
                                         uint256[] memory rand1,
                                         uint256[] memory rand2,
                                         bytes32 rand1Sha) {

                return (lastState.gameAddr,
                                lastState.state,
                                lastState.rand1,
                                lastState.rand2,
                                lastState.rand1Sha);
        }
        
        //being called by casino contract to instantly withdraw FTN from channel to user
        function withdrawInstantly(uint256 amount)
                        external {

                require(msg.sender == address(casino), 'Error: Can be called only from casino contract');
                require(0 < amount, 'Error: Amount should be more than 0');
                require(amount <= frozenWithdrawal, 'Error: amount should be less than initially requested one');
                require(amount <= token.balanceOf(address(this)), 'Error: amount should be less than current balance');
                frozenWithdrawal -= amount;
                token.transfer(player, amount);
        }
        
        //Sets the signer address which is going to sign the fastchannel messages for this channel
        //Should be done by server but only on behalf of the user as per his signature
        function setSigner(address signer, bytes memory uSign) public onlyCasino {
        
                require(validateState(signer, uSign) == player, 'Error: Wrong signature');
                signerAddr = signer;
        }
        
        /**
        * @notice Does a user step
        * Does onchain step as a user. Could be a simple move on any game as long as games
        * nonce is up to date, triggers a balance change, game state change, and nonces change.
        * 
        * @param gameAddr address of the game doing action over
        * @param action is the new action to be performed over current gmae state
        * @param rand1 is the players rundom number provided in plain text, depending on the move could be empty
        * @param rand1Sha is the players rundom number hashed, depending on the move could be empty
        */
        function userStep(
                address gameAddr,
                uint256[] memory action,
                uint256[] memory rand1,
                bytes32 rand1Sha) public onlyPlayer {

                require(Casino.GameAvailability.Enabled == casino.gameAvailable(gameAddr), 'Error: Game is not available');
                if (1 == action[0]) {
                        require(0 != rand1Sha.length, 'Error: Rand1 sha was empty');
                        require(0 == lastState.rand1.length, 'Error: rand1 in last state should have been empty');
                        require(0 == lastState.rand2.length, 'Error:  rand2 in last state should have been empty');
                        require(0 == lastState.rand1Sha.length, 'Error: rand1 sha in last state should have been empty');
                        lastState.gameAddr = gameAddr;
                }
                else if (3 == action[0]) {

                        require(0 == rand1Sha.length, 'Error: rand1 sha was not empty');
                        require(0 != lastState.rand1Sha.length, 'Error: rand1 sha in last state should not be empty');
                        require(lastState.rand1Sha == keccak256(abi.encodePacked(rand1)),
                                'Error: rand provided does not match the hash from last state');
                        require(lastState.gameAddr == gameAddr, 'Error: changing game address at this stage is not possible');
                }
                else {
                        require(false, 'Error: wrong value for action[0]');
                }

                int256 balanceChange;
                nonce++;
                (balanceChange, lastState.state) = BaseGame(gameAddr).doStep(
                                action,
                                rand1,
                                lastState.rand2,
                                lastState.state
                );
                changeBalanceByBC(balanceChange);
                if (3 == action[0]) {

                        delete lastState.rand1;
                        delete lastState.rand2;
                        delete lastState.rand1Sha;
                }
        }
        
         /**
        * @notice Does a server step
        * Does onchain step as a server. Could be a simple move on any game as long as games
        * nonce is up to date, triggers a balance change, game state change, and nonces change.
        * 
        * @param gameAddr address of the game doing action over
        * @param action is the new action to be performed over current gmae state
        * @param rand2 is the servers rundom number provided in plain text
        */
        function serverStep(
                address gameAddr,
                uint256[] memory action,
                uint256[] memory rand2) public onlyCasino {
 
                require(Casino.GameAvailability.Enabled == casino.gameAvailable(gameAddr), 'Error: Game is not available');
                require(lastState.gameAddr == gameAddr, 'Error: changing game address at this stage is not possible');
                require(0 != rand2.length, 'Error: rand2 was empty');
                require(0 != lastState.rand1Sha.length, 'Error: Last state rand1 sha should have not be empty');
                require(0 == lastState.rand1.length, 'Error: Last state rand1 should have been empty');
                require(0 == lastState.rand2.length, 'Error: Last state rand 2 should have been empty');


                int256 balanceChange;
                nonce++;
                (balanceChange, lastState.state) = BaseGame(gameAddr).doStep(
                                action,
                                lastState.rand1,
                                rand2,
                                lastState.state
                );
                changeBalanceByBC(balanceChange);
        }
        
        /**
         * @notice Updates state in channel
         * Updates the state as server, can be called whenever server wants, and will
         * not only update all states but also trigger balance change.
         * This is a blockchain arbiter function that works only with oposite side's 
         * signed message
         * 
         * @param gameAddr which game is this call about
         * @param chanalAddr address of the chanel being serverUpdatedState
         * @param newNonce the new nonce number being set
         * @param balanceChange is the change of balance from fastchannel
         * @param gameState state variables of current game
         * @param rand1Sha users random number's blockhash
         * @param sSign signature of this all from player (signer)
         */
        function updateStateAsServer(
                address gameAddr,
                address chanalAddr,
                uint256[] memory gameState,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newNonce,
                bytes memory sSign)
                public { 

                require(nonce <= newNonce, 'Error: New nonce should be higher than existing one'); //= case is for concurrent onchain
                require(chanalAddr == address(this), 'Error: Wrong channel address');
                require(
                        validateState(
                                gameAddr,
                                chanalAddr,
                                gameState,
                                balanceChange,
                                rand1Sha,
                                nonce,
                                sSign) == signerAddr
                , 'Error: Wrong signature');
                
                nonce = newNonce;
                lastState.state = gameState;
                lastState.gameAddr = gameAddr;
                lastState.rand1Sha = rand1Sha;
                delete lastState.rand1;
                delete lastState.rand2;
                
                changeBalanceByFC(balanceChange);
               
                casino.serverUpdatedState(gameAddr, balanceChange, nonce); //Calls logs
        }
        
        /**
         * @notice Updates state in channel
         * Updates the state as user, can be called whenever user wants, and will
         * not only update all states but also trigger balance change.
         * This is a blockchain arbiter function that works only with oposite side's 
         * signed message
         * 
         * @param gameAddr which game is this call about
         * @param chanalAddr address of the chanel being serverUpdatedState
         * @param newNonce the new nonce number being set
         * @param balanceChange is the change of balance from fastchannel
         * @param gameState state variables of current game
         * @param rand1Sha user's random number's hash
         * @param rand2 is the plain random number from server side
         * @param cSign signature of this all from casino
         */
        function updateStateAsUser(
                address gameAddr,
                address chanalAddr,
                uint256[] memory gameState,
                uint256[] memory rand2,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newNonce,
                bytes memory cSign)
                public {

                require(nonce <= newNonce, 'Error: New nonce should be higher than existing one'); //= case is for concurrent onchain
                require(chanalAddr == address(this));
                require(
                        validateState(
                                gameAddr,
                                chanalAddr,
                                gameState,
                                rand2,
                                balanceChange,
                                rand1Sha,
                                newNonce,
                                cSign) == casino.signerAddr()
                , 'Error: Wrong signature');
                nonce = newNonce;
                lastState.state = gameState;
                lastState.gameAddr = gameAddr;
                lastState.rand2 = rand2;
                lastState.rand1Sha = rand1Sha;
                delete lastState.rand1;
               
                changeBalanceByFC(balanceChange);
                casino.userUpdatedState(gameAddr, balanceChange, nonce); //Calls logs
        }
        
        //Gets the ammount that current channel is capable to play with at the moment
        function getPlayableBalance(int256 _balanceChange) 
                            public
                            view 
                            returns(int256) {
            
                return int256(token.balanceOf(address(this))) + _balanceChange - lastBalanceChange - int256(frozenWithdrawal);
        }
        
        /**
         * @notice Withdraws tokens to owner
         * but first prepareWithdraw should be changed to give casino a chance to
         * update the state within FRZ_HRS time period.
         * @param amount is going to be frozen for withdrawal and wont participate
         * in Fastchannel bet balance
         *
         */
        function withdraw(uint256 amount, address toPlayer)
                        public
                        onlyPlayer {

                require(0 < amount, 'Error: Amount should be more than 0');
                require(amount <= frozenWithdrawal, 'Error: amount should be less than initially requested one');
                require(amount <= token.balanceOf(address(this)), 'Error: amount should be less than initially requested one');
                require(timeOfWithdrawReq < now - FRZ_HRS, 'Error: Can not withdraw sooner than frozen period');
                frozenWithdrawal = 0;
                token.transfer(toPlayer, amount);
        }
        
        //prepares the ammount to withdraw after time passed. Calling withdraw required after.
        function prepareWithdraw(uint amount) public onlyPlayer{

                timeOfWithdrawReq = now;
                frozenWithdrawal = amount;

                casino.userRequestedWithdrawal(player, amount); //Calls logs
        }

        //#region CryptoHelperFunctions
        function validateState(
                address gameAddr,
                address chanalAddr,
                uint256[] memory gameState,
                uint256[] memory rand2,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 currentNonce,
                bytes memory sign)
                public
                pure
                returns(address) {

                bytes32 dataHash = keccak(
                        gameAddr,
                        chanalAddr,
                        gameState,
                        rand2,
                        balanceChange,
                        rand1Sha,
                        currentNonce);
              
                return ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), sign);
        }

        function keccak(
                address gameAddr,
                address chanalAddr,
                uint256[] memory gameState,
                uint256[] memory rand2,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 currentNonce)
                public
                pure
                returns(bytes32) {

                return keccak256(
                        abi.encodePacked(
                                'dev',
                                gameAddr,
                                chanalAddr,
                                currentNonce,
                                balanceChange,
                                gameState,
                                rand1Sha,
                                rand2)
                        );
        }
         
        function validateState(
                address gameAddr,
                address chanalAddr,
                uint256[] memory gameState,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 currentNonce,
                bytes memory sign)
                public
                pure
                returns(address) {

                bytes32 dataHash = keccak(
                        gameAddr,
                        chanalAddr,
                        gameState,
                        balanceChange,
                        rand1Sha,
                        currentNonce);
                return ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), sign);
        }

        function keccak(
                address gameAddr,
                address chanalAddr,
                uint256[] memory gameState,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 currentNonce)
                public
                pure
                returns(bytes32) {

                return keccak256(
                        abi.encodePacked(
                                'dev',
                                gameAddr,
                                chanalAddr,
                                currentNonce,
                                balanceChange,
                                gameState,
                                rand1Sha)
                        );
        }
         
        function validateState(address signerAddress, bytes memory sign)
                public
                pure
                returns(address) {

                bytes32 dataHash = keccak(signerAddress);
                return ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), sign);
        }

        function keccak(address signerAddress)
                                public
                                pure
                                returns(bytes32) {

                return keccak256(abi.encodePacked('dev', signerAddress));
        }
        
         //#endregion CryptoHelperFunctions

        //Being called internally to change channel's balance by Fast Channel
        function changeBalanceByFC(int256 _balanceChange) private {

                int256 diffB = _balanceChange - lastBalanceChange;
                lastBalanceChange = _balanceChange; // Set the lastBalanceChange
                if (diffB > 0) {
                        casino.transferToChannel(uint(diffB));
                }
                else if (diffB < 0) {
                        token.transfer(address(casino), uint(-diffB));
                }
        }

        //Being called internally to change channel's balance by BlockChain
        function changeBalanceByBC(int256 _balanceChange) private {

                lastBalanceChange += _balanceChange; // Add the lastBalanceChange
                if (_balanceChange > 0) {
                        casino.transferToChannel(uint(_balanceChange));
                } 
                else if (_balanceChange < 0) {
                        token.transfer(address(casino), uint(-_balanceChange));
                }
        }
       
}
