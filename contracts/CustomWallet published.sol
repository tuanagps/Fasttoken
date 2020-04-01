pragma solidity >0.5.0;

///Open Zeppelin imports
import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';


//All contracts that should be ownable but also support recovery key reset should derive from this
contract ownableWithRecoveryKey is Ownable {
   
    bytes32 public recoveryKeyHash; //The recovery key's hash that should match to do the reset.
   
    //sets the hash of the recovery key from current owner.
    function setKeyHash(bytes32 hash) public onlyOwner { 
       
        recoveryKeyHash = hash;
        
    } 
    
    //Standard transfer of the ownership
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
        delete recoveryKeyHash;
    }
    
    //Overloading of standard function
    //This will give ownership to address 0 but only if recovery key is set
    //Use first time when handing over to a user with no address.
    function renounceOwnership() public onlyOwner {
        
        require(recoveryKeyHash != 0);
        super.renounceOwnership();
    }
    
    //Transfers the ownership using the one time recovery key plain text.
    function transferOwnerWithRecoveryKey(address newOwner, string memory plainKey) public {
    
        require(hash(plainKey) == recoveryKeyHash);
        _transferOwnership(newOwner);
        delete recoveryKeyHash;
        
        }
    
    //returns the hash of the recovery key for user.
    function hash(string memory plainKey) public pure returns(bytes32) {
       
        return(keccak256(abi.encodePacked(plainKey)));
        
    }
}

//This contract represents a basic ethereum and ERC20 wallet with basic transfer functionality
//It is also ownable with a recovery key.
contract ownableWalletWithRecoveryKey is ownableWithRecoveryKey {
    
    //Transfers any given ERC20 token by the address 
    function transferToken(address tokenAddress, address to, uint256 value) public onlyOwner returns (bool) {
        
        return ERC20(tokenAddress).transfer(to, value);
        
    }
    
    //Gets contracts Ether balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    //Gets contract's ERC20 token balance by it's address.
    function getTokenBalance(address tokenAddress) public view returns (uint256) {

        return ERC20(tokenAddress).balanceOf(address(this));
    }
    
    //Withdraws Ether directly to owner
    function withdraw() public onlyOwner{
        msg.sender.transfer(address(this).balance);
    }
    
     //Withdraws give ERC20 Tokens directly to owner
    function withdrawToken(address tokenAddress) public onlyOwner returns (bool) {
        
        return ERC20(tokenAddress).transfer(msg.sender, ERC20(tokenAddress).balanceOf(address(this)));
        
    }
    function transfer(address to, uint256 value) public onlyOwner {
        
        address payable add =  address(uint160(to));
        add.transfer(value);
      
    }
    
    //Fallback
    function() external payable {

    }

}
