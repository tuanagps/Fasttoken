 
pragma solidity ^0.5.0;


/// openzeppelin imports
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

import './Channel.sol';
import './FastChannelCreator.sol';
import './Fasttoken.sol';


/**
 * @title Central Casino Provider 
 *
 * The Fasttoken casino contract is the central provider for all main operations
 * like holding the bank's balance, track of users, creating and managing new 
 * slots and state channels.
 * Player's balance is stored on his personal channel with no direct access.
 * Casino has owner with limited functionality
 *
 * Fasttoken:By BetConstruct
 */
contract Casino is Ownable {

        using SafeMath for uint256;

        enum GameAvailability { NotExists, Enabled, Disabled }

        Fasttoken public token;
        mapping (address => Channel) public userToChannel;
        mapping (address => GameAvailability) public gameAvailable; // If the game is available
        address[] public channels; // reverse lookup for channels addresses
        address[] public gamesList; // reverse lookup for game list
        uint256 public constant DAILY_LIMIT = 100000; // Daily limit casino can withdraw
        uint256 public lastWithdraw = 0; // Last time Casino withdrawn
        address public signerAddr;
        address public currentChannelCreator;
        bool public isLocked = false; //To lock casino overall in case of bugs

        event ChannelCreated(address userAddress, address indexed newChannelAddress);
        
        event UserRequestedWithdrawal(address indexed chanalAddr, address player, uint256 amount);
        event UserUpdatedState(address gameAddr, address indexed chanalAddr, int256 balanceChange, uint32 nonce);
        event ServerUpdatedState(address gameAddr, address indexed chanalAddr, int256 balanceChange, uint32 nonce);
        event FabricChanged(address from, address to);

        /**
         * @notice Constructor
         *
         * @param _token Fasttoken address
         */
        constructor(address _token) public {

                token = Fasttoken(_token);
                signerAddr = msg.sender;
                currentChannelCreator = address(new FastChannelCreator());
        }

        /**
         * @notice Creates new channel with empty balance one can fill
         *
         * TODO in future look at channel creation with one call.
         */
        function createChannel() external notLocked {

                require(address(userToChannel[msg.sender]) == address(0x0), 'Error: Channel with that address already exists'); //One address one channel.
                Channel f = Channel(FastChannelCreator(currentChannelCreator).createNew(address(this), msg.sender, token));
                userToChannel[msg.sender] = f;
                channels.push(address(f));
                emit ChannelCreated(msg.sender, address(f));
        }

        /**
         * @notice Withdraws tokens to owner
         *
         * @param amount withdraw size
         */
        function withdrawCasinoBank(uint256 amount) external onlyOwner {
                            
                require(casinoAllowedToWithdraw(amount), 'Error: Casino not allowed to withdraw that amount');

                lastWithdraw = now;
                token.transfer(owner(), amount);
        }
        
        /**
         * @notice Withdraws tokens to owner
         *
         * @param amount withdrow size
         * @param channelAddress withdrow size
         */
        function playerFastWithdraw(address channelAddress, uint256 amount)
                                external
                                onlyOwner {
                
                FastChannel ft = FastChannel(channelAddress);
                ft.withdrawInstantly(amount);
        }
        
        /**
         * @notice Adding externally created games' address to our casino
         * if added wrong can always disable, but it will remain in list.
         */
        function addGame(address gameAddress)
                                        external
                                        onlyOwner {

                require(GameAvailability.NotExists == gameAvailable[gameAddress], 'Error: Game already exists');
                gameAvailable[gameAddress] = GameAvailability.Enabled;
                gamesList.push(gameAddress);
        }
        
         /**
         * @notice Sets game's availability to true or false
         * to enable/disable it if needed
         */
        function setGameAvail(address gameAddress, GameAvailability avail)
                                                external
                                                onlyOwner {

                require(GameAvailability.NotExists != avail, 'Error: Can\'t set game availability to 0');
                require(GameAvailability.NotExists != gameAvailable[gameAddress], 'Error: Can\'t set game availibility for not existing game');
                gameAvailable[gameAddress] = avail;
        }

        /**
         * @notice Locks FastChannel, during lock period some operations
         * like creating new channels is forbidden.
         */
        function lock()
                        external
                        onlyOwner {

                isLocked = true;
        }

        /// @notice Unlocks FastChannel.
        function unlock()
                        external
                        onlyOwner {

                isLocked = false;
        }
        
        /**
         * @notice Log function to be called from channels
         *
         * Should be called only from channel
         */
        function userRequestedWithdrawal(
                address player, 
                uint256 amount)
                public {

                require(isValidChannel(msg.sender), 'Error: Unregistered channel');
                emit UserRequestedWithdrawal(msg.sender, player, amount);
        }
        
        /**
         * @notice Log function to be called from channels
         *
         * Should be called only from channel
         */
        function userUpdatedState(
                address gameAddr,
                int256 balanceChange,
                uint32 nonce)
                public {
                
                require(isValidChannel(msg.sender), 'Error: Unregistered channel');
                emit UserUpdatedState(
                        gameAddr,
                        msg.sender,
                        balanceChange,
                        nonce
                );
        }
        
        /**
         * @notice Log function to be called from channels
         *
         * Should be called only from channel
         */
        function serverUpdatedState(
                address gameAddr,
                int256 balanceChange,
                uint32 nonce) 
                public {
                
                require(isValidChannel(msg.sender), 'Error: Unregistered channel');
                emit ServerUpdatedState(
                        gameAddr,
                        msg.sender,
                        balanceChange,
                        nonce
                );
        }
        
        function getChannels() public view returns (address[] memory) {
                               
                return(channels);
        }
        
        function getGames() public view returns (address[] memory) {
                               
                return(gamesList);
        }

        /**
         * @notice Check if Casino can withdraw the given amount.
         *
         * Easy way for now, just allowing withdrawal once a day for the amount
         */
        function casinoAllowedToWithdraw(uint256 amount)
                                        public
                                        view
                                        returns(bool) {

                uint256 balance = token.balanceOf(address(this));
                return (now > lastWithdraw + 1 days) && amount <= DAILY_LIMIT && amount <= balance;
        }
        
        /**
         * @notice Called by Channel to increase it's balance from casino's
         *
         * @param _amount how much to transfare to channel
         * 
         * verifies caller channel with user address
         */
        function transferToChannel(uint256 _amount) public {

                require(isValidChannel(msg.sender), 'Error: Unregistered channel');
                //TODO set daily limit not to drain the casino in case of bugs / limit for one or all channels?
                token.transfer(msg.sender, _amount);
        }
        
        function setCurrentChannelCreator(address cc) public onlyOwner {
            
                emit FabricChanged(currentChannelCreator, cc);
                currentChannelCreator = cc;
        }
        

        /**
         * Check validity of the channel
         *
         * @param a channel address
         */
        function isValidChannel(address a)
                                public
                                view
                                returns (bool) {

                return address(userToChannel[FastChannel(a).player()]) == a;
        }
      
        /// @dev Throws if FastChannel is locked
        modifier notLocked() {

                require(! isLocked, 'Error: The channel is locked');
                _;
        }
}