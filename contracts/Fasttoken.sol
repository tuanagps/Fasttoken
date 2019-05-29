
pragma solidity ^0.5.0;


/// Openzeppelin imports
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol';


contract Fasttoken is ERC20Detailed, ERC20 {

        constructor(address distribution)
                ERC20Detailed('Fasttoken', 'FTN', 18)
                public {

                _mint(distribution, 564000000 * (10 ** uint256(18)));
        }
}
