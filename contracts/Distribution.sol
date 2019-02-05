
pragma solidity ^0.5.0;

/// openzeppelin imports
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

/// Fasttoken imports
import './Fasttoken.sol';


/**
 * @title Fasttoken initial distribution
 */
contract Distribution is Ownable {

        using SafeMath for uint256;


        /// @notice Allocation Types
        enum AllocationType { Founder, Team, PartnersDistribution, PlayersDistribution, Bankroll, Sell, Marketing }


        /// @notice Token
        Fasttoken public fst;


        uint256 private constant DECIMAL_FACTOR = 10**uint256(18);


        /// @notice Initial supply
        uint256 public constant INITIAL_SUPPLY = 564000000 * DECIMAL_FACTOR;


        /// @notice Available supply
        uint256 public availableTotalSupply = INITIAL_SUPPLY;


        /// @notice Types of available supplies
        uint256 public availableFounderSupply                   = 169200000 * DECIMAL_FACTOR;    // 30%
        uint256 public availableTeamSupply                      = 16920000 * DECIMAL_FACTOR;     // 3%
        uint256 public availablePartnersDistributionSupply      = 28200000 * DECIMAL_FACTOR;     // 5%
        uint256 public availablePlayersDistributionSupply       = 141000000 * DECIMAL_FACTOR;    // 25%
        uint256 public availableBankrollSupply                  = 112800000 * DECIMAL_FACTOR;    // 20%
        uint256 public availableSellSupply                      = 84600000 * DECIMAL_FACTOR;     // 15%
        uint256 public availableMarketingSupply                 = 11280000 * DECIMAL_FACTOR;     // 2%


        uint256 public grandTotalClaimed = 0;


        /// @notice Distribution start time
        uint256 public startTime;


        // Allocation with vesting information
        struct Allocation {
                AllocationType allocationType;          // Type of allocation
                uint256 endCliff;                       // Tokens are locked until
                uint256 endVesting;                     // This is when the tokens are fully unvested
                uint256 totalAllocated;                 // Total tokens allocated
                uint256 amountClaimed;                  // Total tokens claimed
        }
        mapping (address => Allocation) public allocations;


        event NewAllocation(address indexed recipient, AllocationType indexed fromSupply, uint256 totalAllocated, uint256 grandTotalAllocated);
        event TokenClaimed(
                address indexed recipient,
                AllocationType indexed fromSupply,
                uint256 amountClaimed,
                uint256 totalAllocated,
                uint256 grandTotalClaimed
        );

        /**
         * @notice Constructor sets the token address
         * @param s The time when token distribution goes live
         *
         */
        constructor(uint256 s) public {

                require(s >= now);
                require(
                        availableTotalSupply == availableFounderSupply.
                                add(availableTeamSupply).
                                add(availablePartnersDistributionSupply).
                                add(availableSellSupply).
                                add(availablePlayersDistributionSupply).
                                add(availableMarketingSupply).
                                add(availableBankrollSupply)
                );
                startTime = s;
                fst = new Fasttoken(address(this));
        }

        /**
         * @notice Allow the owner of the contract to assign a new allocation
         *
         * @param r The recipient of the allocation
         * @param t The total amount of fst available to the receipient (after vesting)
         * @param s The fst supply the allocation will be taken from
         *
         */
        function setAllocation (address r, uint256 t, AllocationType s)
                public
                onlyOwner {

                require(0 == allocations[r].totalAllocated && 0 < t);
                require(AllocationType.Founder <= s && AllocationType.Marketing >= s);
                require(address(0) != r);

                if (AllocationType.Founder == s) {
                        availableFounderSupply = availableFounderSupply.sub(t);
                        allocations[r] = Allocation(
                                AllocationType.Founder,
                                startTime + 365 days,
                                startTime + 2 * 365 days,
                                t,
                                0
                        );
                } else if (AllocationType.Team == s) {
                        availableTeamSupply = availableTeamSupply.sub(t);
                        allocations[r] = Allocation(
                                AllocationType.Team,
                                startTime + 365 days,
                                startTime + 2 * 365 days,
                                t,
                                0
                        );
                } else if (AllocationType.PartnersDistribution == s) {
                        availablePartnersDistributionSupply = availablePartnersDistributionSupply.sub(t);
                        allocations[r] = Allocation(
                                AllocationType.PartnersDistribution,
                                startTime + 365 days,
                                startTime + 365 days,
                                t,
                                0
                        );
                } else if (AllocationType.PlayersDistribution == s) {
                        availablePlayersDistributionSupply = availablePlayersDistributionSupply.sub(t);
                        allocations[r] = Allocation(
                                AllocationType.PlayersDistribution,
                                startTime + 30 days,
                                startTime + 365 days,
                                t,
                                0
                        );
                } else if (AllocationType.Sell == s) {
                        availableSellSupply = availableSellSupply.sub(t);
                        allocations[r] = Allocation(
                                AllocationType.Sell,
                                0,
                                0,
                                t,
                                0
                        );
                } else if (AllocationType.Marketing == s) {
                        availableMarketingSupply = availableMarketingSupply.sub(t);
                        allocations[r] = Allocation(
                                AllocationType.Marketing,
                                0,
                                0,
                                t,
                                0
                        );
                } else if (AllocationType.Bankroll == s) {
                        availableBankrollSupply = availableBankrollSupply.sub(t);
                        allocations[r] = Allocation(
                                AllocationType.Bankroll,
                                0,
                                0,
                                t,
                                0
                        );
                }
                availableTotalSupply = availableTotalSupply.sub(t);
                emit NewAllocation(
                        r,
                        s,
                        t,
                        grandTotalAllocated()
                        );
        }

        /**
         * @notice Transfer a recipients available allocation to their address
         *
         * @param r The address to withdraw tokens for
         *
         */
        function transferTokens (address r) public {
                
                require(allocations[r].amountClaimed < allocations[r].totalAllocated);
                require(now >= allocations[r].endCliff);
                require(now >= startTime);
                uint256 newAmountClaimed;
                if (allocations[r].endVesting > now) {
                        // Transfer available amount based on vesting schedule and allocation
                        newAmountClaimed = allocations[r].totalAllocated.mul(now.sub(startTime)).div(allocations[r].endVesting.sub(startTime));
                } else {
                        // Transfer total allocated (minus previously claimed tokens)
                        newAmountClaimed = allocations[r].totalAllocated;
                }
                uint256 tokensToTransfer = newAmountClaimed.sub(allocations[r].amountClaimed);
                require(fst.transfer(r, tokensToTransfer));
                allocations[r].amountClaimed = newAmountClaimed;
                grandTotalClaimed = grandTotalClaimed.add(tokensToTransfer);
                emit TokenClaimed(
                        r,
                        allocations[r].allocationType,
                        tokensToTransfer,
                        newAmountClaimed,
                        grandTotalClaimed
                );
        }

        // Returns the amount of fst allocated
        function grandTotalAllocated()
                                public
                                view
                                returns (uint256) {

                return INITIAL_SUPPLY - availableTotalSupply;
        }

        // Allow transfer of accidentally sent ERC20 tokens
        function refundTokens(address r, address t)
                                public
                                onlyOwner {

                require(t != address(fst));
                ERC20 token = ERC20(t);
                uint256 balance = token.balanceOf(address(this));
                require(token.transfer(r, balance));
        }
}
