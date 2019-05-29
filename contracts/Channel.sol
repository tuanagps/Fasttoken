
pragma solidity ^0.5.0;

/// openzeppelin imports
import 'openzeppelin-solidity/contracts/cryptography/ECDSA.sol';

import './Fasttoken.sol';
import './Casino.sol';


/**
 * @title Channel
 * Is base channel for fast channels, All channels derived from this have compatible interface for Fastchannel fabric and casino usage.
 * Fasttoken:By BetConstruct
 */
contract Channel { 
   
        Fasttoken public token;
        Casino public casino;
        address public player;
        
        /// being called by casino contract to instantly withdraw FTN from channel to user
        function withdrawInstantly(uint256 amount) external;
        
        /**
         * @notice Withdraws tokens to owner
         * but first prepareWithdraw should be changed to give casino a chance to
         * update the state within FRZ_HRS time period.
         * @param amount is going to be frozen for withdrawal and wont participate
         * in Fastchannel bet balance
         *
         */
        function withdraw(uint256 amount, address toPlayer) public;
        
        /// prepares the ammount to withdraw after time passed. Calling withdraw required after.
        function prepareWithdraw(uint amount) public;
                                
        modifier onlyPlayer() {

                require(msg.sender==player, 'Error: Only player can call this function');
                _;
        }
        
        modifier onlyCasino() {

                require(msg.sender==casino.signerAddr(), 'Error: Only Casino can call this function');
                _;
        }
        
}