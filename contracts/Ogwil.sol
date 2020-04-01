
pragma solidity ^0.5.0;


import './BaseGame.sol';


/**
 * @title Ogwil game main contract
 */
contract Ogwil is BaseGame {

        uint256 public height = 10;
        uint256 public gameSize = 3;

        /// @notice Constructor
        constructor() public {

                gameName = 'Ogwil';
        }

        function getRandBoundaries(uint256[] calldata, uint256[] calldata action)
                external
                view
                returns (uint256[] memory randBoundaries) {

                randBoundaries = new uint256[](1);
                randBoundaries[0] = action[1] + 1;
        }

        /**
         * @notice Gets win for given ogwil choice
         *
         * @param gameType with 2 columns or 1
         * @param choice what was the users choice
         * @param lastWin number to multiply
         * @param rand the merged number
         * @return Win and Number of free spins
         *
         */
        function getChoiceResult(
                uint256 gameType,
                uint256 choice,
                uint256 lastWin,
                uint256 rand)
                public
                view
                returns (uint256) {

                require(gameSize > rand, 'Error: rand too big');
                if (choice == rand + 1) {
                        return (gameType + 1) * lastWin;
                }
                return 0;
        }

        function mergeRands(
                uint256[] memory ,
                uint256[] memory action,
                uint256[] memory rand1,
                uint256[] memory rand2)
                public
                view
                returns (uint256[] memory) {

                require(rand1.length == rand2.length, 'Error: rand1 length should be 2');
                require(rand2.length == 2, 'Error: rand2 length should be 2');

                uint256[] memory rand = new uint256[](1);
                rand[0] = (rand1[0] + rand2[0]) % (action[1] + 1);
                return rand;
        }

        /**
         *
         * @notice Gets new state and balance for given state and action.
         *
         * @param state is an array and represents game state
         *              state[0] - 0->unInit, 1->sha1, 2->r2, 3->r1
         *              state[1] - 0->unInit, 1->doubling, 2->trippling
         *              state[2] - bet
         *              state[3] - line
         *              state[4] - choice 1/2/3
         *              state[5] - X
         *              state[6] - lastWin
         *              state[7] - X
         * @param action is an array and represents action
         *              action[0] - 0->invalid, 1->sha1, 2->r2, 3->r1,
         *              action[1] - 0->unInit, 1->doubling, 2->trippling
         *              action[2] - bet
         *              action[3] - line
         *              action[4] - choice 1/2/3
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
                require (gameSize > state[1], 'Error: state[1] invalid value');

                require (5 == action.length, 'Error: action invalid argument count');
                require (0 < action[0], 'Error: action[0] invalid value');
                require (0 < action[1], 'Error: action[1] invalid value');
                require (4 > action[0], 'Error: action[0] invalid value');
                require (gameSize > action[1], 'Error: action[1] invalid value');
                /// TODO Check maximum value of bet
                require (gameSize >= action[4], 'Error: action[4] invalid value');

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
                require(action[3] <= height, 'Error: action[3] should be greater than height');
                require(0 != action[3], 'Error: action[3] should not be 0');
                require(0 != action[4], 'Error: action[4] should not be 0');

                require(1 == action[3] || state[3] + 1 == action[3], 'Error: incorrect line jump');

                if (1 == action[3]) {
                        balanceChange = int(action[2] * action[1]);
                        state[6] = 0;
                }
                else {
                        require(state[1] == action[1], 'Error: Can not change game column count during game');
                        balanceChange = int(state[6] * state[1]);
                }

                state[0] = 1; // Change state to current
                state[1] = action[1];
                state[2] = action[2];
                state[3] = action[3];
                state[4] = action[4];

                return(balanceChange, state);
        }

        function serverReply(uint256[] memory state, uint256[] memory action)
                private
                pure
                returns (int256, uint256[] memory) {

                assert(2 == action[0]);
                require(1 == state[0], 'Error: state[0] should not be 1');
                require(state[1] == action[1], 'Error: state[1] should be equal to action[1]');
                int256 balanceChange = 0;
                if (1 == state[3]) {
                        balanceChange = -int256((state[1] + 1) * state[2]);
                }
                else {
                        balanceChange = -int256((state[1] + 1) * state[6]);
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

                int256 balanceChange = 0;
                uint256 win = 0;

                if (1 == state[3]) {
                        win = state[2];
                }
                else {
                        win = state[6];
                }

                win = getChoiceResult(
                        state[1],
                        state[4],
                        win,
                        mergeRands(
                                state,
                                action,
                                rand1,
                                rand2)[0]
                        );

                state[0] = 3; // Change state to current
                state[4] = 0;
                state[6] = win;

                if (0 == state[6]) {
                        state[3] = 0;
                        state[2] = 0;
                }

                balanceChange = int256(win);
                return(balanceChange, state);
        }
}