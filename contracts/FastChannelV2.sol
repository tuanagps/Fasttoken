
pragma solidity ^0.5.0;


/// openzeppelin imports
import '@openzeppelin/contracts/math/SafeMath.sol';

/// Fasttoken imports
import './Channel.sol';
import './BaseGame.sol';


/**
 * @title FastChannelV2
 * This is a fastchannel version 2 - Fasttoken's updated fastchannel. Still derived from 'channel' and reverse compatible.
 * The changes over verion 1 are:
 * Ability to play multiple games simultanously.
 * All game nonces grow by one, global nonce on sidechannels incremented by NONCE_JUMP. Global nonce is mandatory for 
 * balance, and game nonces are for states. To make a step on any game its nonce should be up to date, if not the individual 
 * game should be updated with nonce and game states.
 * 
 * Fasttoken:By BetConstruct
 */
contract FastChannelV2 is Channel {
           
        
        using SafeMath for uint256;
        
        uint16 public constant VERSION = 2;   
        uint16 public constant NONCE_JUMP = 1000;
        address public signerAddr;
        address public pendingPlayer;
        int256 public lastBalanceChange; 
        uint256 private constant FRZ_HRS = 2 hours; //Default is 2 hours, overwrite for new channel types
        uint256 public timeOfWithdrawReq;
        uint256 public frozenWithdrawal;
        uint64 public nonce = 0;
        mapping (address => GameStates) public lastState;
        uint256[] public nonceList;


        struct GameStates {
            
                uint256[] state;
                uint256[] rand1;
                uint256[] rand2;
                uint64 gameNonce;
                bytes32 rand1Sha;
                
        }

        constructor(address _casino, address _player, Fasttoken _token) public {

                token = _token;
                player = _player;
                casino = Casino(_casino);
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
        
        //Gets game states for the givven game address
        function getLastGameState(address gameAddress) public
                                view
                                returns (uint64 gameNonce,
                                         uint256[] memory state,
                                         uint256[] memory rand1,
                                         uint256[] memory rand2,
                                         bytes32 rand1Sha) {

                return (lastState[gameAddress].gameNonce,
                                lastState[gameAddress].state,
                                lastState[gameAddress].rand1,
                                lastState[gameAddress].rand2,
                                lastState[gameAddress].rand1Sha);
        }
        
        //Gets the global nonce list of games for the channel 
        function getNonceList() 
                public
                view
                returns (uint256[] memory) {

                return (nonceList);
        }
        
        //Sets the signer address which is going to sign the fastchannel messages for this channel
        //Should be done by server but only on behalf of the user as per his signature
        function setSigner(address signer, bytes memory uSign) public onlyCasino {
        
                require(recoverSigner(signer, uSign) == player, 'Error: Wrong signature');
                signerAddr = signer;
        }
        
        //Requests a change for channel player, should be approved by both sides to work
        function requestPlayerChange(address newPlayer) public onlyPlayer {
            
            pendingPlayer = newPlayer;
        }
        
        //approves a change for channel player, should be called by casino contract on servers behalf
        function approvePlayerChange(address newPlayer) public {
            
            require(msg.sender == address(casino), 'Error: Can be called only from casino contract');
            require (newPlayer == pendingPlayer);
            player = newPlayer;
        }
        
        /**
        * @notice Does a user step
        * Does onchain step as a user. Could be a simple move on any game as long as games
        * nonce is up to date, triggers a balance change, game state change, and nonces change.
        * 
        * @param gameAddr address of the game doing action over
        * @param gameNumber the number that the game is registered in casino
        * @param action is the new action to be performed over current gmae state
        * @param rand1 is the players random number provided in plain text, depending on the move could be empty
        * @param rand1Sha is the players random number hashed, depending on the move could be empty
        */
        function userStep(
                address gameAddr,
                uint256 gameNumber,
                uint256[] memory action,
                uint256[] memory rand1,
                bytes32 rand1Sha) public onlyPlayer {
                    
                require(gameAddr == casino.gamesList(gameNumber), 'Error: game address and game number do not match');
                require(Casino.GameAvailability.Enabled == casino.gameAvailable(gameAddr), 'Error: Game is not available');
                require(lastState[gameAddr].gameNonce == nonceList[gameNumber], 'Error: Games state needs to be updated');
                
                if (1 == action[0]) {
                        require(0 != rand1Sha.length, 'Error: Rand1 sha was empty');
                        require(0 == lastState[gameAddr].rand1.length, 'Error: rand1 in last state should have been empty');
                        require(0 == lastState[gameAddr].rand2.length, 'Error:  rand2 in last state should have been empty');
                        require(0 == lastState[gameAddr].rand1Sha.length, 'Error: rand1 sha in last state should have been empty');
                }
                else if (3 == action[0]) {

                        require(0 == rand1Sha.length, 'Error: rand1 sha was not empty');
                        require(0 != lastState[gameAddr].rand1Sha.length, 'Error: rand1 sha in last state should not be empty');
                        require(
                                lastState[gameAddr].rand1Sha == keccak256(abi.encodePacked(rand1)),
                                'Error: rand provided does not match the hash from last state');
                }
                else {
                        require(false, 'Error: wrong value for action[0]');
                }

                int256 balanceChange;
                lastState[gameAddr].gameNonce++;
                nonce++;
                (balanceChange, lastState[gameAddr].state) = BaseGame(gameAddr).doStep(
                                action,
                                rand1,
                                lastState[gameAddr].rand2,
                                lastState[gameAddr].state
                );
                changeBalanceByBC(balanceChange);
                if (3 == action[0]) {

                        delete lastState[gameAddr].rand1;
                        delete lastState[gameAddr].rand2;
                        delete lastState[gameAddr].rand1Sha;
                }
        }
        
        /**
        * @notice Does a server step
        * Does onchain step as a server. Could be a simple move on any game as long as games
        * nonce is up to date, triggers a balance change, game state change, and nonces change.
        * 
        * @param gameAddr address of the game doing action over
        * @param gameNumber the number that the game is registered in casino
        * @param action is the new action to be performed over current gmae state
        * @param rand2 is the servers random number provided in plain text
        */
        function serverStep(
                address gameAddr,
                uint256 gameNumber,
                uint256[] memory action,
                uint256[] memory rand2) public onlyCasino {
 
                require(gameAddr == casino.gamesList(gameNumber), 'Error: game address and game number do not match');
                require(Casino.GameAvailability.Enabled == casino.gameAvailable(gameAddr), 'Error: Game is not available');
                require(lastState[gameAddr].gameNonce == nonceList[gameNumber], 'Error: Games state needs to be updated');
                
                require(0 != rand2.length, 'Error: rand2 was empty');
                require(0 != lastState[gameAddr].rand1Sha.length, 'Error: Last state rand1 sha should have not be empty');
                require(0 == lastState[gameAddr].rand1.length, 'Error: Last state rand1 should have been empty');
                require(0 == lastState[gameAddr].rand2.length, 'Error: Last state rand 2 should have been empty');


                int256 balanceChange;
                lastState[gameAddr].gameNonce++;
                nonce++;
                (balanceChange, lastState[gameAddr].state) = BaseGame(gameAddr).doStep(
                                action,
                                lastState[gameAddr].rand1,
                                rand2,
                                lastState[gameAddr].state
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
        * @param channelAddr address of the chanel being updated
        * @param gameNonces the list of gamenonces to be
        * @param balanceChange is the change of balance from fastchannel
        * @param newNonce the new nonce for the channel
        * @param sSign signature of this all from player (signer)
        */
        function updateStateAsServer(
                address channelAddr,
                uint256[] memory gameNonces,
                int256 balanceChange,
                uint32 newNonce,
                bytes memory sSign)
                public { 
                    
                //= case is for concurrent onchain
                require(nonce + NONCE_JUMP <= newNonce, 'Error: New nonce should be higher than existing one'); 
                require(channelAddr == address(this), 'Error: Wrong channel address');
                require(
                        recoverSigner(
                                channelAddr,
                                gameNonces,
                                balanceChange,
                                newNonce,
                                sSign) == signerAddr,
                 'Error: Wrong signature');
                nonce = newNonce;
                nonceList = gameNonces;
                changeBalanceByFC(balanceChange);
               
              // casino.serverUpdatedState(gameAddr, balanceChange, nonce); //Calls logs //TODO new logs for new types
        }
        
        /**
         * @notice Updates state in channel
         * Updates the state as user, can be called whenever user wants, and will
         * not only update all states but also trigger balance change.
         * This is a blockchain arbiter function that works only with oposite side's 
         * signed message
         * 
         * @param channelAddr address of the chanel being updated
         * @param gameNonces the list of gamenonces to be
         * @param balanceChange is the change of balance from fastchannel
         * @param newNonce the new nonce for the channel
         */
        function updateStateAsUser(
                address channelAddr,
                uint256[] memory gameNonces,
                int256 balanceChange,
                uint32 newNonce,
                bytes memory cSign)
                public {

                //= case is for concurrent onchain
                require(nonce + NONCE_JUMP <= newNonce, 'Error: New nonce should be higher than existing one'); 
                require(channelAddr == address(this), 'Error: Wrong channel address');
                require(
                        recoverSigner(
                                channelAddr,
                                gameNonces,
                                balanceChange,
                                newNonce,
                                cSign) == casino.signerAddr(),
                 'Error: Wrong signature');
                nonce = newNonce;
                nonceList = gameNonces;
                changeBalanceByFC(balanceChange);
                
               // casino.userUpdatedState(gameAddr, balanceChange, nonce); //Calls logs //Calls logs //TODO new logs for new types
        }
        
         /**
        * @notice Updates game state in channel
        * Updates the state of a single game as server, can be called whenever server wants
        * updates games state only does not trigger balance change.
        * This is a blockchain arbiter function that works only with oposite side's 
        * signed message
        * 
        * @param gameAddr address of the game being updated
        * @param channelAddr address of the chanel being serverUpdatedState
        * @param rand2 here supposed to be empty
        * @param newGameNonce the nonce for this game
        * @param balanceChange is the change of balance from fastchannel
        * @param sSign signature of this all from player (signer)
        */
        function updateGameStateAsServer(
                address gameAddr,
                address channelAddr,
                uint256[] memory gameState,
                uint256[] memory rand2,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newGameNonce,
                bytes memory sSign)
                public { 

               
                require(channelAddr == address(this), 'Error: Wrong channel address');
                require(
                        recoverSigner(
                                gameAddr,
                                channelAddr,
                                gameState,
                                rand2,
                                balanceChange,
                                rand1Sha,
                                newGameNonce,
                                sSign) == signerAddr,
                 'Error: Wrong signature');
                lastState[gameAddr].gameNonce = newGameNonce;
                lastState[gameAddr].rand1Sha = rand1Sha;
                lastState[gameAddr].state = gameState;
               
              //  casino.serverUpdatedState(gameAddr, balanceChange, nonce); //Calls logs //TODO new logs for new types
        }
        
          /**
        * @notice Updates game state in channel
        * Updates the state of a single game as user, can be called whenever user wants
        * updates games state only does not trigger balance change.
        * This is a blockchain arbiter function that works only with oposite side's 
        * signed message
        * 
        * @param gameAddr address of the game being updated
        * @param channelAddr address of the chanel being serverUpdatedState
        * @param newGameNonce the nonce for this game
        * @param balanceChange is the change of balance from fastchannel
        * @param cSign signature of this all from casino
        */
        function updateGameStateAsUser(
                address gameAddr,
                address channelAddr,
                uint256[] memory gameState,
                uint256[] memory rand2,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newGameNonce,
                bytes memory cSign)
                public {

                
                require(channelAddr == address(this), 'Error: Wrong channel address');
                require(
                        recoverSigner(
                                gameAddr,
                                channelAddr,
                                gameState,
                                rand2,
                                balanceChange,
                                rand1Sha,
                                newGameNonce,
                                cSign) == casino.signerAddr(),
                'Error: Wrong signature');
                
                lastState[gameAddr].gameNonce = newGameNonce;
                lastState[gameAddr].rand2 = rand2;
                lastState[gameAddr].state = gameState;
               
               // casino.userUpdatedState(gameAddr, balanceChange, nonce); //Calls logs //TODO new logs for new types
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
         * 
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
        function recoverSigner(
                address channelAddr,
                uint256[] memory gameNonces,
                int256 balanceChange,
                uint32 currentNonce,
                bytes memory sign)
                public
                pure
                returns(address) {

                bytes32 dataHash = keccak(
                                channelAddr,
                                gameNonces,
                                balanceChange,
                                currentNonce
                                );
              
                return ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), sign);
        }

        function keccak(
                address channelAddr,
                uint256[] memory gameNonces,
                int256 balanceChange,
                uint32 currentNonce)
                public
                pure
                returns(bytes32) {

                return keccak256(
                        abi.encodePacked(
                                'dev',
                                channelAddr,
                                gameNonces,
                                balanceChange,
                                currentNonce
                                )
                        );
        }
         /*
        function recoverSigner(
                address gameAddr,
                address channelAddr,
                uint256[] memory gameState,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newGameNonce,
                bytes memory sign)
                public
                pure
                returns(address) {

                bytes32 dataHash = keccak(
                        gameAddr,
                        channelAddr,
                        gameState,
                        balanceChange,
                        rand1Sha,
                        newGameNonce);
                return ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), sign);
        }

        function keccak(
                address gameAddr,
                address channelAddr,
                uint256[] memory gameState,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newGameNonce)
                public
                pure
                returns(bytes32) {

                return keccak256(
                        abi.encodePacked(
                                'dev',
                                gameAddr,
                                channelAddr,
                                gameState,
                                balanceChange,
                                rand1Sha,
                                newGameNonce)
                        );
        }
        */      
        function recoverSigner(
                address gameAddr,
                address channelAddr,
                uint256[] memory gameState,
                uint256[] memory rand2,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newGameNonce,
                bytes memory sign)
                public
                pure
                returns(address) {

                bytes32 dataHash = keccak(
                        gameAddr,
                        channelAddr,
                        gameState,
                        rand2,
                        balanceChange,
                        rand1Sha,
                        newGameNonce);
                return ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), sign);
        }

        function keccak(
                address gameAddr,
                address channelAddr,
                uint256[] memory gameState,
                uint256[] memory rand2,
                int256 balanceChange,
                bytes32 rand1Sha,
                uint32 newGameNonce)
                public
                pure
                returns(bytes32) {

                return keccak256(
                        abi.encodePacked(
                                'dev',
                                gameAddr,
                                channelAddr,
                                gameState,
                                rand2,
                                balanceChange,
                                rand1Sha,
                                newGameNonce)
                        );
        }
         
        function recoverSigner(address signerAddress, bytes memory sign)
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

