
pragma solidity ^0.5.0;


import './SlotWithBonus.sol';
import './WithRFBMW.sol';


/**
 * @title New Slot instance with 5 rows
 */
contract BillionaireToys is SlotWithBonus, WithRFBMW {

        uint256 public constant REELS_FS_COUNT = 5;
        uint256 public constant REELS_COUNT = 5;
        uint256 public constant WINS_COUNT = 12;
        uint256 public constant LINES_COUNT = 20;
        uint256 public constant BONUS_COUNT = 4;


        /// @notice Constructor
        constructor() public {

                gameName = 'BillionaireToys';
                wildCard = 1;
                imageSize = 3;
                bonusSymbol = 12;
                reelsBonus = new uint256[][](2);
                reelsBonus[0] = new uint256[](0);
                reelsBonus[1] = new uint256[](0);
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

        function addReelBonus(uint256[] memory bonusFSArray, uint256[] memory bonusMLArray ) public {

                require(BONUS_COUNT == bonusFSArray.length && BONUS_COUNT == bonusMLArray.length, 'Error: Incorrect bonus length');
                require(0 == reelsBonus[0].length, 'Error: Bonus reels were already initialized');
                reelsBonus[0] = bonusFSArray; // 10, 8, 25, 8
                reelsBonus[1] = bonusMLArray; // 8, 5, 4, 8
        }
}
