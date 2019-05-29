
pragma solidity ^0.5.0;


import './BaseGame.sol';


/**
 * @title HiLo game main contract
 */
contract HiLo is BaseGame {
        
        uint256[][] public wins;
        
        /// @notice Constructor
        constructor() public {

                gameName = "HiLo";
        }
        
        function addWin(uint256[] memory winArray) public {

                require(wins.length < 2, 'Error:Too many wins on initialization');
                wins.push(winArray);
        }
        
        function getWinArrays() public view returns(uint256[] memory winLo, uint256[] memory winHi) {
            
            winLo = new uint256[](0);
            winHi = new uint256[](0);
            
            if(0 != wins.length) {
                
                if(0 != wins[0].length) {
                    winLo = wins[0];
                }
                if(1 < wins.length && 0 != wins[1].length) {
                    winHi = wins[0];
                }
            }
            return (winLo, winHi);
        }
        /**
         * @notice Gets win for given HiLo choice 
         *
         * @param choice what was the users choice
         * @param multiplier the coefficient of multiplication
         * @param bet number to multiply
         * @param card the card that was on table
         * @param rand the merged number
         * @return Win and Number of free spins
         * 
         */
        function getHiLoResult(uint256 choice, uint256 bet, uint256 card, uint256 multiplier, uint256 rand) 
                public
                pure
                returns (uint256) {
                    
                    /*
                    uint256 cardWeight = card % 13;
                    if (rand >= card) {
                        rand++;
                    }
                    uint256 randWeight = rand % 13;
                    
                    require(1 == choice || 2 == choice, "Error: Incorrect choice");
                    
                    if ((1 == choice && randWeight < cardWeight) || (2 == choice && randWeight > cardWeight)) { //Lo HI
                    
                        return(bet * multiplier / 100);
                    }
                    else if(randWeight == cardWeight) {
                        return bet / 100;
                    }
                    return 0;
                    */

                    require(13 > card, "Error: Card must be less 13");
                    require(1 == choice || 2 == choice, "Error: Incorrect choice");
                    
                    if ((1 == choice && rand < card) || (2 == choice && rand > card)) { //Lo HI
                    
                        return(bet * multiplier / 100);
                    }
                    else if(rand == card) {
                        return bet / 100;
                    }

                    return 0;
                }
        
         /**
         * @notice Gets coefficient for the given card and choice option
         *
         * @param choice what was the users choice
         * @param card the card that was on table
         * @return coefficient
         * 
         */        
        function getMultiplier(uint256 choice, uint256 card) 
                public
                view
                returns (uint256) {
                    
                    uint256 cardWeight = card % 13;
                    
                    require(1 == choice || 2 == choice, "Error: Incorrect choice");
                    require(wins.length > 0, "Error: Uninitialized wins");
                    
                    return(wins[choice -1][cardWeight]);
                }        
                
        
        function mergeRands(
                uint256[] memory ,
                uint256[] memory ,
                uint256[] memory rand1,
                uint256[] memory rand2) 
                                                        public
                                                        view
                                                        returns (uint256[] memory) {

                require(rand1.length == rand2.length, 'Error: rand1 length should be 2');
                require(rand2.length == 2, 'Error: rand2 length should be 2');

                uint256[] memory rand = new uint256[](1);
                //rand[0] = (rand1[0] + rand2[0]) % (51);
                rand[0] = (rand1[0] + rand2[0]) % (13);
                return rand;
        }
       
         function getRandBoundaries(uint256[] calldata, uint256[] calldata )
                external
                view
                returns (uint256[] memory randBoundaries) {
                    randBoundaries = new uint256[](1);
                    //randBoundaries[0] = 51;
                    randBoundaries[0] = 13;
        }
       

        /**
         *
         * @notice Gets new state and balance for given state and action.
         *
         * @param state is an array and represents game state
         *              state[0] - 0->unInit, 1->sha1, 2->r2, 3->r1
         * 
         *              state[1] - choice 0->unInit, 1->Lo, 2->Hi
         *              state[2] - bet
         *              state[3] - card 0 -> 13
         *              state[4] - Multiplier
         * @param action is an array and represents action
         *              action[0] - 0->invalid, 1->sha1, 2->r2, 3->r1,
         * 
         *              action[1] - choice 0->unInit, 1->Lo, 2->Hi
         *              action[2] - bet
         *              action[3] - card 0 -> 13
         * @param rand1 is a generated random numbers from player. Can be empty
         * @param rand2 is a generated random numbers from server. Can be empty
         * @return balance change and game state
         *
         */
        function doStep(
                uint256[] memory state,
                uint256[] memory action,
                uint256[] memory rand1,
                uint256[] memory rand2) 
                public
                view
                returns (int256, uint256[] memory) { 
                
                if(0 == state.length) {
                    state = new uint256[](5);
                }
                
                require (4 > state[0], 'Error: state[0] invalid value');
             
                
                require (0 < action[0] && 4 > action[0], 'Error: action[0] invalid value');
                /// TODO Check maximum value of bet
                                
                if (1 == action[0]) { // player sends sha1
                        return startAction(state, action);
                }
                else if (2 == action[0]) { //casino replies r2
                        return serverReply(state, action);
                }
                else if (3 == action[0]) { //player opens the rand

                        return finishAction(
                                state,
                                action,
                                rand1,
                                rand2);
                }
                assert(false);
        }

        function startAction(uint256[] memory state, uint256[] memory action) 
                private
                view
                returns (int256, uint256[] memory) { 

                assert(1 == action[0]);
                require(3 == state[0] || 0 == state[0], 'Error: state[0] had wrong value');
                int256 balanceChange = 0;
                
                require(1 == action[1] || 2 == action[1], "Error: Invalid value for action[1]");
                require(4 == action.length, "Error: Action should be of 4 length");
                state[1] = action[1];
                state[2] = action[2];
                state[3] = action[3];
                state[4] = getMultiplier(state[1], state[3]);
            
                balanceChange = int(state[2] * state[4] - state[2]);
                
                state[0] = 1; // Change state to current
                return(balanceChange, state);                            
        }

        function serverReply(uint256[] memory state, uint256[] memory action) 
                private
                pure
                returns (int256, uint256[] memory) { 

                assert(2 == action[0]);
                require(1 == state[0], 'Error: state[0] should not be 1');
                
                int256 balanceChange = 0;
                balanceChange = -int(state[2] * state[4]);
                
                state[0] = 2; // Change state to current
                return(balanceChange, state);                            
        }

        function finishAction(
                uint256[] memory state,
                uint256[] memory action,
                uint256[] memory rand1,
                uint256[] memory rand2) 
                private
                view
                returns (int256, uint256[] memory) { 

                assert(3 == action[0]);
                require(2 == state[0], 'Error: state[0] should be 2');
                
                int256 balanceChange = 0;
                uint256 win = 0;
                
                uint256 randCard = mergeRands(state, action, rand1, rand2)[0];
                win = getHiLoResult(state[1], state[2], state[3], state[4], randCard);
                state[1] = 0;
                state[2] = 0;
                state[3] = 0;
                state[4] = 0;

                balanceChange = int(win);
                
                state[0] = 3; // Change state to current
                return(balanceChange, state);                            
        }
}

