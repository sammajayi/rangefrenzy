// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RangeFrenzyMarket is
    Initializable,
    Ownable2StepUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    enum Category {
        CRYPTO,
        SPORTS,
        LOCAL
    }
    enum MarketStatus {
        OPEN,
        CLOSED,
        RESOLVED,
        CANCELLED
    }

    struct Range {
        string label;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 totalStaked;
    }

    struct UserStake {
        uint256 rangeIndex;
        uint256 amount;
        bool claimed;
    }

    uint16 public constant FEE_BPS = 200;
    uint16 public constant BPS_DENOM = 10_000;

    uint256[50] private __gap;

    IERC20 public stakeToken;
    address public feeRecipient;

    string public marketQuestion;
    Category public category;
    uint256 public resolutionDeadline;
    MarketStatus public status;

    uint256 public minStakeAmount;

    Range[] public ranges;
    uint256 public totalPool;

    uint256 public actualOutcome;
    uint256[] public winningRangeIndexes;

    mapping(address => UserStake) public userStakes;
    address[] public stakers;
    mapping(address => bool) private _hasStaked;

    event Staked(
        address indexed user,
        uint256 indexed rangeIndex,
        uint256 amount,
        uint256 newTotalPool
    );
    event BettingClosed(uint256 timestamp);
    event MarketResolved(
        uint256 actualOutcome,
        uint256[] winningRangeIndexes,
        uint256 poolAfterFee,
        uint256 feePaid
    );
    event WinningsClaimed(address indexed user, uint256 payout);
    event StakeRefunded(address indexed user, uint256 amount);
    event MarketCancelled(string reason, uint256 timestamp);
    event MinStakeUpdated(uint256 newMin);
    event FeeRecipientUpdated(address indexed newRecipient);

    error ZeroAddress();
    error EmptyQuestion();
    error NeedAtLeastTwoRanges();
    error ArrayLengthMismatch();
    error DeadlineMustBeInFuture();
    error UpperBoundBelowLower(uint256 index);
    error RangesNotSortedOrOverlap(uint256 index);
    error MarketNotOpen();
    error DeadlinePassed();
    error AlreadyStaked();
    error BelowMinStake(uint256 sent, uint256 minimum);
    error InvalidRangeIndex(uint256 index);
    error NoStakeFound();
    error AlreadyResolvedOrCancelled();
    error CannotCancel();
    error MarketNotResolved();
    error MarketNotCancelled();
    error NotAWinner();
    error AlreadyClaimed();

    modifier onlyOpen() {
        if (status != MarketStatus.OPEN) revert MarketNotOpen();
        if (block.timestamp >= resolutionDeadline) revert DeadlinePassed();
        _;
    }

    modifier onlyResolved() {
        if (status != MarketStatus.RESOLVED) revert MarketNotResolved();
        _;
    }

    function initialize(
        address _owner,
        address _stakeToken,
        address _feeRecipient,
        string memory _question,
        Category _category,
        uint256 _resolutionDeadline,
        uint256 _minStakeAmount,
        string[] memory _rangeLabels,
        uint256[] memory _lowerBounds,
        uint256[] memory _upperBounds
    ) external initializer {
        __Ownable_init(_owner);
        __Pausable_init();

        if (_stakeToken == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (bytes(_question).length == 0) revert EmptyQuestion();
        if (_resolutionDeadline <= block.timestamp)
            revert DeadlineMustBeInFuture();
        if (_rangeLabels.length < 2) revert NeedAtLeastTwoRanges();
        if (
            _rangeLabels.length != _lowerBounds.length ||
            _lowerBounds.length != _upperBounds.length
        ) revert ArrayLengthMismatch();

        stakeToken = IERC20(_stakeToken);
        feeRecipient = _feeRecipient;
        marketQuestion = _question;
        category = _category;
        resolutionDeadline = _resolutionDeadline;
        minStakeAmount = _minStakeAmount;
        status = MarketStatus.OPEN;

        for (uint256 i = 0; i < _rangeLabels.length; i++) {
            if (_upperBounds[i] < _lowerBounds[i])
                revert UpperBoundBelowLower(i);
            if (i > 0 && _lowerBounds[i] < _upperBounds[i - 1])
                revert RangesNotSortedOrOverlap(i);

            ranges.push(
                Range({
                    label: _rangeLabels[i],
                    lowerBound: _lowerBounds[i],
                    upperBound: _upperBounds[i],
                    totalStaked: 0
                })
            );
        }
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function stake(
        uint256 rangeIndex,
        uint256 amount
    ) external onlyOpen whenNotPaused nonReentrant {
        if (rangeIndex >= ranges.length) revert InvalidRangeIndex(rangeIndex);
        if (amount < minStakeAmount)
            revert BelowMinStake(amount, minStakeAmount);
        if (_hasStaked[msg.sender]) revert AlreadyStaked();

        stakeToken.safeTransferFrom(msg.sender, address(this), amount);

        userStakes[msg.sender] = UserStake({
            rangeIndex: rangeIndex,
            amount: amount,
            claimed: false
        });

        ranges[rangeIndex].totalStaked += amount;
        totalPool += amount;

        stakers.push(msg.sender);
        _hasStaked[msg.sender] = true;

        emit Staked(msg.sender, rangeIndex, amount, totalPool);
    }

    function closeBetting() external onlyOwner {
        if (status != MarketStatus.OPEN) revert MarketNotOpen();
        status = MarketStatus.CLOSED;
        emit BettingClosed(block.timestamp);
    }

    function resolve(uint256 _actualOutcome) external onlyOwner nonReentrant {
        if (status == MarketStatus.RESOLVED || status == MarketStatus.CANCELLED)
            revert AlreadyResolvedOrCancelled();

        status = MarketStatus.RESOLVED;
        actualOutcome = _actualOutcome;

        for (uint256 i = 0; i < ranges.length; i++) {
            bool matchesUpper = (i == ranges.length - 1)
                ? _actualOutcome <= ranges[i].upperBound
                : _actualOutcome < ranges[i].upperBound;
            if (
                _actualOutcome >= ranges[i].lowerBound &&
                matchesUpper
            ) {
                winningRangeIndexes.push(i);
            }
        }

        uint256 feePaid = 0;
        if (totalPool > 0) {
            feePaid = (totalPool * FEE_BPS) / BPS_DENOM;
            totalPool -= feePaid;
            if (feePaid > 0) {
                stakeToken.safeTransfer(feeRecipient, feePaid);
            }
        }

        emit MarketResolved(
            _actualOutcome,
            winningRangeIndexes,
            totalPool,
            feePaid
        );
    }

    function cancel(string calldata reason) external onlyOwner {
        if (status == MarketStatus.RESOLVED || status == MarketStatus.CANCELLED)
            revert CannotCancel();

        status = MarketStatus.CANCELLED;
        emit MarketCancelled(reason, block.timestamp);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setMinStakeAmount(uint256 _min) external onlyOwner {
        minStakeAmount = _min;
        emit MinStakeUpdated(_min);
    }

    function setFeeRecipient(address _new) external onlyOwner {
        if (_new == address(0)) revert ZeroAddress();
        feeRecipient = _new;
        emit FeeRecipientUpdated(_new);
    }

    function claim() external onlyResolved nonReentrant {
        UserStake storage s = userStakes[msg.sender];

        if (s.amount == 0) revert NoStakeFound();
        if (s.claimed) revert AlreadyClaimed();
        if (!_isWinner(s.rangeIndex)) revert NotAWinner();

        s.claimed = true;

        uint256 payout = _calculatePayout(msg.sender);
        stakeToken.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(msg.sender, payout);
    }

    function refund() external nonReentrant {
        if (status != MarketStatus.CANCELLED) revert MarketNotCancelled();

        UserStake storage s = userStakes[msg.sender];
        if (s.amount == 0) revert NoStakeFound();
        if (s.claimed) revert AlreadyClaimed();

        s.claimed = true;
        uint256 refundAmount = s.amount;

        stakeToken.safeTransfer(msg.sender, refundAmount);
        emit StakeRefunded(msg.sender, refundAmount);
    }

    function _isWinner(uint256 rangeIndex) internal view returns (bool) {
        for (uint256 i = 0; i < winningRangeIndexes.length; i++) {
            if (winningRangeIndexes[i] == rangeIndex) return true;
        }
        return false;
    }

    function _calculatePayout(address user) internal view returns (uint256) {
        UserStake storage s = userStakes[user];

        uint256 winnersTotal = 0;
        for (uint256 i = 0; i < winningRangeIndexes.length; i++) {
            winnersTotal += ranges[winningRangeIndexes[i]].totalStaked;
        }

        if (winnersTotal == 0) return 0;

        return (s.amount * totalPool) / winnersTotal;
    }

    function rangesCount() external view returns (uint256) {
        return ranges.length;
    }

    function stakersCount() external view returns (uint256) {
        return stakers.length;
    }

    function getAllRanges() external view returns (Range[] memory) {
        return ranges;
    }

    function getWinningRanges() external view returns (uint256[] memory) {
        return winningRangeIndexes;
    }

    function previewPayout(address user) external view returns (uint256) {
        if (status != MarketStatus.RESOLVED) return 0;
        UserStake storage s = userStakes[user];
        if (s.amount == 0 || s.claimed) return 0;
        if (!_isWinner(s.rangeIndex)) return 0;
        return _calculatePayout(user);
    }

    function hasStaked(address user) external view returns (bool) {
        return _hasStaked[user];
    }

    function getMarketSummary()
        external
        view
        returns (
            string memory question,
            uint8 cat,
            uint256 deadline,
            uint8 marketStatus,
            uint256 pool,
            uint256 numStakers,
            uint256 outcome,
            bool isPaused
        )
    {
        return (
            marketQuestion,
            uint8(category),
            resolutionDeadline,
            uint8(status),
            totalPool,
            stakers.length,
            actualOutcome,
            paused()
        );
    }

    function getStakersPage(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory page) {
        uint256 total = stakers.length;
        if (offset >= total || limit == 0) return new address[](0);
        uint256 count = (offset + limit > total) ? total - offset : limit;
        page = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = stakers[offset + i];
        }
    }

    function getUserStake(
        address user
    )
        external
        view
        returns (
            uint256 rangeIndex,
            uint256 amount,
            bool claimed,
            string memory rangeLabel,
            uint256 estimatedPayout
        )
    {
        UserStake storage s = userStakes[user];
        rangeIndex = s.rangeIndex;
        amount = s.amount;
        claimed = s.claimed;
        rangeLabel = s.amount > 0 ? ranges[s.rangeIndex].label : "";
        estimatedPayout = this.previewPayout(user);
    }
}
