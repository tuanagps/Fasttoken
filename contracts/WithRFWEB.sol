
pragma solidity ^0.5.0;


import './BaseSlot.sol';


/**
 * @title All slots that have the following features can be derived from this class
 * Reeled Freespins - On win game might enter freespin mode where it doesnt pay for spins, with different reels for freespin
 * WildCards Expanding - wildcard symbols that replace other symbols with the given ruls can expand across multiple lines
 * Bouns - symbol for entering bonus game
 */
contract WithRFWEB is BaseSlot{


        uint256 public bonusSymbol;
        uint256 public wildCard;
        uint256[][] public reelsFreespin;
        uint256 public multiplier;
        uint256 public bonusFreespins;


        function getRandBoundaries(uint256[] calldata state, uint256[] calldata action)
                external
                view
                returns (uint256[] memory randBoundaries) {

                if (1 == action[1]) {
                        if (0 != state.length && state[7] > 0) {
                                randBoundaries = new uint256[](reelsFreespin.length);
                                for (uint256 i = 0; i < reelsFreespin.length; i++) {
                                        randBoundaries[i] = reelsFreespin[i].length;
                                }

                        }
                        else {
                                randBoundaries = new uint256[](reels.length);
                                for (uint256 i = 0; i < reels.length; i++) {
                                        randBoundaries[i] = reels[i].length;
                                }
                        }
                }
                else if (2 == action[1]) {
                        randBoundaries = new uint256[](1);
                        randBoundaries[0] = 2;

                }
                else {
                        require(false, 'Error: Wrong game type');
                }
                return randBoundaries;
        }

        /**
         * @notice Gets win for given spin
         * @dev This order of arguments saves from stack too deep problem.
         *
         * @param bet Bet per line
         * @param line Line Count of the bet
         * @param rand Spin's random values'
         * @param freespinCount Number of current freespins.
         * @return Win and Number of free spins
         *
         */
        function getSpinResult(
                uint256 bet,
                uint256 line,
                uint256[] memory rand,
                uint256 freespinCount)
                public
                view
                returns (uint256[] memory retvals) {

                uint256 winRate = 0; // Rate to be calculated
                uint256 s;
                uint256 n;
                uint256 wcInOrder;
                uint256 currentS;

                uint256[][] memory linesLocal = new uint256[][](line);
                for (uint256 i = 0; i < line; i++) {
                        linesLocal[i] = lines[i];
                }

                require(0 != wins.length, 'Error: Uninitialized spins');
                require(0 != reels.length, 'Error: Uninitialized reels');
                require(0 != lines.length, 'Error: Uninitialized lines');
                require(0 != reelsFreespin.length, 'Error: Uninitialized free spins');
                // require(rand.length == reels.length, 'Error: Rand array length should be the same as reels length');
                require(line <= linesLocal.length, 'Error: line value is bigger than existing lines count');

                uint256[][] memory image;
                if (0 == freespinCount) {
                        image = getImage(rand);
                }
                else if (0 < freespinCount) {
                        image = getFreespinImage(rand);
                        //Extending Wild Cards
                        for (uint256 i = 0; i < image.length; i++) {
                                for (uint256 j = 0; j < imageSize; j++) {
                                        if (wildCard == image[i][j]) {
                                                for (uint256 jj = 0; jj < imageSize; jj++) {
                                                        if (bonusSymbol != image[i][jj]) {
                                                                image[i][jj] = wildCard;
                                                        }
                                                }
                                        }
                                }
                        }
                }

                {
                        uint256 j = 0;
                        for (uint256 i = 0; i < line; ++i) {
                                j = 0;
                                s = image[0][linesLocal[i][0]];
                                n = linesLocal[i].length - 1;
                                while (s == wildCard && j < n) {

                                        j++;
                                        s = image[j][linesLocal[i][j]];

                                }
                                wcInOrder = j;
                                require(s - 1 < wins.length, 'Error: Current symbol is out of wins borders');
                                j++;
                                while (j <= n) {

                                        currentS = image[j][linesLocal[i][j]];

                                        if (currentS != wildCard && currentS != s) {
                                                break;
                                        }

                                        j++;

                                }
                                j--;
                                if (0 != wcInOrder) {
                                        wcInOrder--;
                                }
                                /////// WildCard calculation
                                require(j < wins[s - 1].length, 'Error: out of wins border');
                                require(wcInOrder < wins[wildCard - 1].length, 'Error: wildcard out of wins border');
                                if (wins[wildCard - 1][wcInOrder] > wins[s - 1][j] && 0 != wcInOrder) {
                                        winRate += wins[wildCard - 1][wcInOrder];
                                        continue;
                                }
                                ////////
                                winRate += wins[s - 1][j];
                        }
                }

                if (0 < freespinCount) {
                        winRate = winRate * multiplier;
                        freespinCount --;
                }

                ///////Starts Bonus calculation
                uint256 bonusCount = 0;
                for (uint256 j = 0; j < image.length; j++) {
                        for (uint256 i = 0; i < imageSize; i++) {
                                if (bonusSymbol == image[j][i]) {
                                        bonusCount++;
                                }
                        }
                }
                ///////////////
                retvals = new uint256[](3);
                retvals[0] = bet * winRate;
                if (3 == bonusCount) {
                        retvals[1] = bonusFreespins;
                }
                else {
                        retvals[1] = freespinCount;
                }
                retvals[2] = bonusCount;
                return retvals;
        }

        function mergeRands(
                uint256[] memory state,
                uint256[] memory action,
                uint256[] memory rand1,
                uint256[] memory rand2)
                public
                view
                returns (uint256[] memory rand) {

                if (1 == action[1]) {
                        if (0 != state.length && state[7] > 0) {
                                return mergeFreespinRands(rand1, rand2);
                        }
                        else {
                                return mergeSpinRands(rand1, rand2);
                        }

                }
                else if (2 == action[1]) {
                        return mergeDoublingRands(rand1, rand2);
                }
                require(false, 'Error: Wrong game type');
        }

        function mergeFreespinRands(uint256[] memory rand1, uint256[] memory rand2)
                public
                view
                returns (uint256[] memory) {

                require(rand1.length == rand2.length, 'Error: rand2 length is not correct');
                require(rand1.length == getRandLength(1), 'Error: rand1 length is not correct');
                uint256[] memory rand = new uint256[](rand1.length - 1);
                for (uint256 i = 0; i < rand1.length - 1; i++) {
                        rand[i] = (rand1[i] + rand2[i]) % reelsFreespin[i].length;
                }

                return rand;
        }

        function getFreespinImageLine(uint256[] memory rand, uint256 lineNumber)
                public
                view
                returns (uint256[] memory) {

                return getFreespinImage(rand)[lineNumber];
        }

        function getDoublingResult(uint256, uint256, uint256)
                public
                pure
                returns (uint256) {

                require(false, 'This function cannot be called');
        }


        function getReelFreespinArray(uint8 index)
                public
                view
                returns (uint256[] memory) {

                require (reelsFreespin.length > index, 'Error: index is out of  border');
                return reelsFreespin[index];
        }

        function getReelFreespinLength(uint256 reel)
                public
                view
                returns (uint256) {

                require(reel < reelsFreespin.length, 'Error: reel index is out of  border');
                return reelsFreespin[reel].length;
        }

        function getReelsFreespinLength()
                public
                view
                returns (uint256) {

                return reelsFreespin.length;
        }

        function getFreespinImage(uint256[] memory _rand)
                internal
                view
                returns (uint256[][] memory image) {

                image = new uint256[][](reelsFreespin.length);

                uint256 i = 0;
                uint256 j = 0;
                uint256 tempRand;
                uint256 tempRLength;
                uint256 offset;

                for (i = 0; i < image.length; i++) {
                        image[i] = new uint256[](imageSize);
                        tempRand = _rand[i];
                        tempRLength = reelsFreespin[i].length;
                        for (j = 0; j < imageSize; j++) {

                                offset = (tempRand + j) % tempRLength;
                                image[i][j] = reelsFreespin[i][offset];
                        }
                }
                return image;
        }
}
