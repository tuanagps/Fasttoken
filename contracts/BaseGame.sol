
pragma solidity ^0.5.0;


/**
 * @title Base contract for all games with minimal required functionality
 */
contract BaseGame {
        
        int256 public constant DECIMALS = 1000000000000000000;
        int256 public constant WIN_MAX = 1000 * DECIMALS; // TODO discuss this, should be different for each game type therefore should be in baseslot
      
        function doStep(
                uint256[] memory lastState,
                uint256[] memory action,
                uint256[] memory rand1,
                uint256[] memory rand2)
                public
                view
                returns (int256, uint256[] memory);
                
        function getRandLength(uint256 gameType)
                public
                view
                returns (uint256 randLength);
                
         function mergeRands(
                uint256[] memory rand1,
                uint256[] memory rand2,
                uint256 gameType)
                public
                view
                returns (uint256[] memory rand);
}
