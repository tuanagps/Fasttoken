
pragma solidity ^0.5.0;


import './ClassicSlot.sol';
import './WithDS.sol';

/** 
 * @title New Slot instance with 5 rows 
 */
contract FlamingFruits is ClassicSlot, WithDS {
    
    
        uint256 public constant REELS_COUNT = 5;
        uint256 public constant WINS_COUNT = 8;
        uint256 public constant LINES_COUNT = 5;
        
        
        /// @notice Constructor
        constructor() public {

                gameName = "FlamingFruits";
                scatSymbol = 8;
                imageSize = 3;
        }

        function addLine(uint256[] memory lineArray) public {
            
                require(lines.length < LINES_COUNT, 'Error:Too many lines on initialization');
                lines.push(lineArray);
        }

        function addWin(uint256[] memory winArray) public {

                require(wins.length < WINS_COUNT, 'Error:Too many wins on initialization');
                wins.push(winArray);
        }

        function addReel(uint256[] memory reelArray) public {

                require(reels.length < REELS_COUNT,  'Error:Too many reels on initialization');
                reels.push(reelArray);
        }

}
