pragma solidity ^0.5.0;


import './BaseSlot.sol';


/**
 * @title All classic slots like this can be derived from here
 */
contract ClassicSlot is BaseSlot {

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
                returns (uint256[] memory);

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
                returns (uint256);

        /**
         *
         * @notice Gets new state and balance for given state and action.
         *
         * @param state is an array and represents game state
         *              state[0] - 0->unInit, 1->sha1, 2->r2, 3->r1
         *              state[1] - 0->unInit, 1->normal, 2->doubling
         *              state[2] - bet
         *              state[3] - line
         *              state[4] - choice
         *              state[5] - multiplier
         *              state[6] - lastWin
         *              state[7] - number of freespins
         * @param action is an array and represents action
         *              action[0] - 0->invalid, 1->sha1, 2->r2, 3->r1,
         *              action[1] - 0->invalid, 1->spin, 2->doubling
         *              action[2] - bet
         *              action[3] - line
         *              action[4] - choice
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

                if (0 == state.length) {
                        state = new uint256[](8);
                }

                require (4 > state[0], 'Error: state[0] invalid value');
                require (3 > state[1], 'Error: state[1] invalid value');
                require (3 > state[4], 'Error: state[4] invalid value');

                require (5 == action.length, 'Error: action invalid argument count');
                require (0 < action[0], 'Error: action[0] invalid value');
                require (0 < action[1], 'Error: action[1] invalid value');
                require (4 > action[0], 'Error: action[0] invalid value');
                require (3 > action[1], 'Error: action[1] invalid value');
                /// TODO Check maximum value of bet
                require (3 > action[4], 'Error: action[4] invalid value');

                if (1 == action[0]) { //player sends sha1
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

        /// Helper member functions
        function startAction(uint256[] memory state, uint256[] memory action)
                private
                pure
                returns (int256, uint256[] memory) {

                assert(1 == action[0]);
                require(3 == state[0] || 0 == state[0], 'Error: state[0] had wrong value');
                int256 balanceChange = 0;
                if (1 == action[1]) { // spin

                        require(0 != action[2], 'Error: action[2] should not be 0');
                        require(0 != action[3], 'Error: action[3] should not be 0');
                        require(0 == action[4], 'Error: action[4] should be 0');

                        if (0 == state[7]) {
                                balanceChange = -int256(action[2] * action[3]);
                                state[2] = action[2];
                                state[3] = action[3];
                        }
                        else {
                                require(action[2] == state[2], 'Error: state[2] should be equal to action[2]');
                                require(action[3] == state[3], 'Error: state[3] should be equal to action[3]');
                        }
                        balanceChange += WIN_MAX; // TODO calculate WIN_MAX properly based on bet
                        state[6] = 0;
                }
                else if (2 == action[1]) { // doubling

                        require(0 == state[4], 'Error: state[4] should be 0');
                        require(0 != state[6], 'Error: state[6] should not be 0');
                        require(0 == state[7], 'Error: state[7] should be 0');

                        require(0 == action[2], 'Error: action[2] should be 0');
                        require(0 == action[3], 'Error: action[3] should be 0');
                        require(0 != action[4], 'Error: action[4] should not be 0');

                        balanceChange = int(state[6]);
                        state[4] = action[4];
                }
                state[0] = 1; // Change state to current
                state[1] = action[1];

                return(balanceChange, state);
        }

        function serverReply(uint256[] memory state, uint256[] memory action)
                private
                pure
                returns (int256, uint256[] memory) {

                assert(2 == action[0]);
                require(1 == state[0], 'Error: state[0] should not be 1');
                require(state[1] == action[1], 'Error: state[1] should be equal to action[1]');
                require(0 == action[2], 'Error: action[2] should be 0');
                require(0 == action[3], 'Error: action[3] should be 0');
                require(0 == action[4], 'Error: action[4] should be 0');

                int256 balanceChange = 0;
                if (1 == state[1]) { // normal
                        require(0 != state[2], 'Error: state[2] should not be 0');
                        require(0 != state[3], 'Error: state[3] should not be 0');
                        require(0 == state[4], 'Error: state[4] should be 0');
                        require(0 == state[6], 'Error: state[6] should be 0');
                        balanceChange = -WIN_MAX; // TODO calculate WIN_MAX properly based on bet
                }
                else if (2 == state[1]) { // doubling
                        // require(0 == state[2], 'Error: state[2] should be 0');
                        // require(0 == state[3], 'Error: state[3] should be 0');
                        require(0 != state[4], 'Error: state[4] should not be 0');
                        require(0 != state[6], 'Error: state[6] should not be 0');
                        balanceChange = -int256(2 * state[6]);
                }
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
                require(state[1] == action[1], 'Error: state[1] should be equal to action[1]');
                require(0 == action[2], 'Error: action[2] should be 0');
                require(0 == action[3], 'Error: action[3] should be 0');
                require(0 == action[4], 'Error: action[4] should be 0');

                int256 balanceChange = 0;
                uint256 win = 0;
                uint256 numberOfFreeSpins = 0;
                if (1 == state[1]) { // normal
                        require(0 != state[2], 'Error: state[2] should not be 0');
                        require(0 != state[3], 'Error: state[3] should not be 0');
                        require(0 == state[4], 'Error: state[4] should be 0');
                        require(0 == state[6], 'Error: state[6] should be 0');
                        uint256[] memory temp = getSpinResult(
                                state[2],
                                state[3],
                                mergeRands(
                                        state,
                                        action,
                                        rand1,
                                        rand2),
                                state[7]);
                        win = temp[0];
                        numberOfFreeSpins = temp[1];
                        state[7] == numberOfFreeSpins;
                }
                else if (2 == state[1]) { // doubling

                        require(0 != state[4], 'Error: state[4] should not be 0');
                        require(0 != state[6], 'Error: state[6] should not be 0');
                        win = getDoublingResult(
                                state[4],
                                state[6],
                                mergeRands(
                                        state,
                                        action,
                                        rand1,
                                        rand2)[0]
                                );
                }
                state[0] = 3; // Change state to current
                state[1] = 0;
                state[4] = 0;
                state[6] = win;

                balanceChange = int256(win);
                return(balanceChange, state);
        }
}

