
pragma solidity ^0.5.0;


import './BaseSlot.sol';


/**
 * @title All slots that have the following features can be derived from this class
 *
 * Freespins - On win game might enter freespin mode where it doesnt pay for spins 
 * WildCards - wildcard symbols that replace other symbols with the given ruls
 * Doubling - can enter the doubling game on win 
 * Scats - there are scat symbols in game
 */
contract WithFWDS is BaseSlot {


        uint256 public scatSymbol;
        uint256 public wildCard;
        
        /**
         * @notice Gets win for given spin
         * @dev This order of arguments saves from stack too deep problem.
         *
         * @param bet Bet per line
         * @param line Line Count of the bet
         * @param rand Spin's random values'
         * @return Win and Number of free spins
         * 
         */
        function getSpinResult(uint256 bet, uint256 line, uint256[] memory rand, uint256) 
                public
                view
                returns (uint256[] memory retvals) {

                uint256 winRate = 0; // Rate to be calculated
                uint256 i = 0;
                uint256 j = 0;
                uint256 s;
                uint256 n;
                uint256 wcInOrder;
                uint256 currentS;

                uint256[][] memory linesLocal = new  uint256[][](line);
                for(i = 0; i < line; i++) {
                    linesLocal[i] = lines[i];
                }
                
                require(0 != wins.length, 'Error: Uninitialized spins');
                require(0 != reels.length, 'Error: Uninitialized reels');
                require(0 != lines.length, 'Error: Uninitialized lines');
                //require(rand.length == reels.length, 'Error: Rand array length should be the same as reels length');
                require(line <= linesLocal.length, 'Error: line value is bigger than existing lines count');
                
                uint256[][] memory image = getImage(rand);

                for (i = 0; i < line; ++i) {

                        j = 0;
                        s = image[0][linesLocal[i][0]]; 
                        n = linesLocal[i].length - 1; 

                        while (s == wildCard && j < n) {

                                j++;
                                s = image[j][linesLocal[i][j]]; 

                        }

                        wcInOrder = j;
                        require(s - 1 < wins.length, 'Error: Current symbol is out of wins borders');

                        if (s == scatSymbol) {
                                continue;
                        }
                        j++;
                        while (j <= n) {

                                currentS = image[j][linesLocal[i][j]]; 

                                if (currentS != wildCard && currentS != s) {
                                        break;
                                }

                                j++;

                        }

                        j--;
                        require(j < wins[s - 1].length, 'Error: out of wins border');
                        
                        ///////WildCard calculation   

                        if (0 != wcInOrder) {
                                wcInOrder--;
                        }
                        require(wcInOrder < wins[wildCard - 1].length, 'Error: wildcard out of wins border');

                        if (wins[wildCard - 1][wcInOrder] > wins[s - 1][j] && 0 != wcInOrder) {
                                winRate += wins[wildCard - 1][wcInOrder];
                                continue;
                        }
                        ////////

                        winRate += wins[s - 1][j];

                }


                ///////Starts Scat calculation
                
                uint256 scatCount = 0;
                for (j = 0; j < image.length; j++) { 
                        for (i = 0; i < imageSize; i++) {
                                if (scatSymbol == image[j][i]) {
                                        scatCount++;
                                }
                        }
                }
                if (0 != scatCount) {
                        winRate += (wins[scatSymbol - 1][scatCount - 1] * line);
                }
                
                ///////////////
                retvals = new uint256[](2);
                retvals[0] = bet * winRate;
                retvals[1] = scatCount;

                return (retvals); 
        }
        
        /**
         * @notice Gets doubling win for given choice
         *
         * @param choice user's choice 1/2 and 0 if undecided
         * @param lastWin amount to double
         * @param rand Doubling's random values'
         * @return Win 
         * 
         */
        function getDoublingResult(uint256 choice, uint256 lastWin, uint256 rand) 
                public
                pure
                returns (uint256) {

               
                require(2 > rand, 'Error: rand should be less than 2');
                if (choice == rand + 1) {
                        return 2 * lastWin;
                }
                return 0;
        }

}
