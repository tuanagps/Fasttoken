
pragma solidity ^0.5.0;

import './BaseGame.sol';


/**
 * @title Base contract for all slots
 */
contract BaseSlot is BaseGame {

        uint256[][] public reels;
        uint256[][] public wins;
        uint256[][] public lines;

        uint8 public imageSize;


        function getLineArray(uint8 index)
                        public
                        view
                        returns (uint256[] memory) {

                require (lines.length > index, 'Error: index is out of  border');
                return lines[index];
        }

        function getWinArray(uint8 index)
                        public
                        view
                        returns (uint256[] memory) {

                require (wins.length > index, 'Error: index is out of  border');
                return wins[index];
        }

        function getReelArray(uint8 index)
                        public
                        view
                        returns (uint256[] memory) {

                require (reels.length > index, 'Error: index is out of  border');
                return reels[index];
        }

        function getReelLength(uint256 reel)
                                public
                                view
                                returns (uint256) {

                require(reel < reels.length, 'Error: reel index is out of  border');
                return reels[reel].length;
        }

        function getReelsLength()
                                public
                                view
                                returns (uint256) {

                return reels.length;
        }
        
        function getWinsLength()
                                public
                                view
                                returns (uint256) {

                return wins.length;
        }
        
        function getLinesLength()
                                public
                                view
                                returns (uint256) {

                return lines.length;
        }
        
        function mergeSpinRands(uint256[] memory rand1, uint256[] memory rand2) 
                                                        public
                                                        view
                                                        returns (uint256[] memory) {

                require(rand1.length == rand2.length, 'Error: rand2 length is not correct');
                require(rand1.length == getRandLength(1), 'Error: rand1 length is not correct'); 
                uint256[] memory rand = new uint256[](rand1.length - 1);
                for (uint256 i = 0; i < rand1.length - 1; i++) {
                        rand[i] = (rand1[i] + rand2[i]) % reels[i].length;
                }
                

                return rand;
        }
        
        function mergeDoublingRands(uint256[] memory rand1, uint256[] memory rand2) 
                                                                            view
                                                                            public
                    returns (uint256[] memory) {
                                                            
                require(rand2.length == rand1.length, 'Error: rand2 length should be 2');
                require(rand1.length == getRandLength(2), 'Error: rand1 length should be 2');
                uint256[] memory rand = new uint256[](1);
                rand[0] = (rand1[0] + rand2[0]) % 2;
                return rand;
        }
        
        function getRandLength(uint256 stepType)
                internal
                view
                returns (uint256 randLength) {
                    if(1 == stepType) {
                        return reels.length + 1;
                    }
                    else if(2 == stepType) {
                        return 2;
                    }
                    require(false, "Error: Wrong game type");
                }
        function getRandBoundaries(uint256[] calldata , uint256[] calldata action)
                external
                view
                returns (uint256[] memory randBoundaries) {

                    if (1 == action[1]) {
                        randBoundaries = new uint256[](reels.length);
                        
                        for (uint256 i = 0; i < reels.length; i++) {
                            randBoundaries[i] = reels[i].length;
                        }
                        
                    }
                    else if (2 == action[1]) {
                        
                        randBoundaries = new uint256[](1);
                        randBoundaries[0] = 2;
          
                    }
                    else {
                        require(false, "Error: Wrong game type");
                    }
                    
                    return randBoundaries;
                }
                
         function mergeRands(
                uint256[] memory ,
                uint256[] memory action,
                uint256[] memory rand1,
                uint256[] memory rand2)
                public
                view
                returns (uint256[] memory rand) {
                   
                    if (1 == action[1]) {
                        return mergeSpinRands(rand1, rand2);
                    }
                    else if (2 == action[1]) {
                        return mergeDoublingRands(rand1, rand2);
                    }
                    require(false, "Error: Wrong game type");
                }
        
        function getImageLine(uint256[] memory rand, uint256 lineNumber)
                                        public
                                        view
                                        returns (uint256[] memory) {
                                        
                return getImage(rand)[lineNumber];                                    
        }
    
        function getImage(uint256[] memory _rand)
                                        internal
                                        view
                                        returns (uint256[][] memory image) {
        
                image = new uint256[][](reels.length);
                
                uint256 i = 0;
                uint256 j = 0;
                uint256 tempRand;
                uint256 tempRLength;
                uint256 offset;

                for (i = 0; i < image.length; i++) {
                        image[i] = new uint256[](imageSize); 
                        tempRand = _rand[i];
                        tempRLength = reels[i].length;
                        for (j = 0; j < imageSize; j++) {

                                offset = (tempRand + j) % tempRLength;
                                image[i][j] = reels[i][offset];
                        }
                }
                return image;
        }
}
