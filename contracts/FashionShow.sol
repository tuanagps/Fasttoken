
pragma solidity ^0.5.0;

/// Fasttoken imports
import './ClassicSlot.sol';
import './WithRFRWEB.sol';


/**
 * @title New Slot instance with 5 rows
 */
contract FashionShow is ClassicSlot, WithRFRWEB {

        uint256 public constant REELS_FS_COUNT = 5;
        uint256 public constant REELS_COUNT = 5;
        uint256 public constant WINS_COUNT = 12;
        uint256 public constant LINES_COUNT = 50;
        
        
        /// @notice Constructor
        constructor() public {

                bonusSymbol = 12; 
                wildCard = 1;
                imageSize = 3;
                bonusFreespins = 7;
                multiplier = 1;
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
        
        function addFreespinReel(uint256[] memory reelArray) public {

                require(reelsFreespin.length < REELS_FS_COUNT,  'Error:Too many freespin reels on initialization');
                reelsFreespin.push(reelArray);
        }
        
        function getSpinResult(uint256 bet, uint256 line, uint256[] memory rand, uint256 freespinCount) 
                public
                view
                returns (uint256, uint256) {
                    uint256 win;
                    uint256 freeSpin;
                    (win, freeSpin) = super.getSpinResult(bet, line, rand, freespinCount);
                    return (win / 10, freeSpin);
                }
                
         function getRandLength(uint256 gameType)
                public
                view
                returns (uint256 randLength) {
                    if(1 == gameType) {
                        return reels.length + 2;
                    }
                    else if(2 == gameType) {
                        return 2;
                    }
                    require(false, "Error: Wrong game type");
                }
}

