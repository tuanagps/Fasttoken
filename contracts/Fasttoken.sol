
pragma solidity ^0.5.0;


/// openzeppelin imports
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';


contract Fasttoken is ERC20 {

        string public constant NAME = 'Fasttoken';
        string public constant SYMBOL = 'FTN';
        uint256 public constant DECIMALS = 18;
        uint256 public constant INITIAL_SUPPLY = 564000000 * (10 ** uint256(DECIMALS));

        constructor(address distribution) public {
                _mint(distribution, INITIAL_SUPPLY);
        }
}
