
pragma solidity ^0.5.0;

/// Fasttoken imports
import './ClassicSlot.sol';
import './WithRFRWEB.sol';


/**
 * @title New Slot instance with 5 rows
 *
 */
contract FashionShow is ClassicSlot, WithRFRWEB {

        uint256 public constant REELS_FS_COUNT = 5;
        uint256 public constant REELS_COUNT = 5;
        uint256 public constant WINS_COUNT = 12;
        uint256 public constant LINES_COUNT = 50;

        /// @notice Constructor
        constructor() public {

                gameName = 'FashionShow';
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

        function getSpinResult(
                uint256 bet,
                uint256 line,
                uint256[] memory rand,
                uint256 freespinCount)
                public
                view
                returns (uint256[] memory retvals) {

                require(50 == line, 'Error: On this game only 50 lines accepted');
                retvals = super.getSpinResult(
                        bet,
                        line,
                        rand,
                        freespinCount);
                retvals[0] = retvals[0] / 10;
                return (retvals);
        }
}
