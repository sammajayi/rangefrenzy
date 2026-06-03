// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RangeFrenzyMarket.sol";

contract MarketFactory is Initializable, Ownable2StepUpgradeable, UUPSUpgradeable, PausableUpgradeable {

    uint256[50] private __gap;

    address public stakeToken;
    address public feeRecipient;
    address public marketImplementation;

    address[] public allMarkets;
    mapping(uint8 => address[]) public marketsByCategory;
    mapping(address => bool) public isMarket;

    event MarketCreated(
        address indexed marketProxy,
        address indexed implementation,
        string question,
        uint8 category,
        uint256 resolutionDeadline,
        uint256 minStakeAmount,
        uint256 createdAt
    );
    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);
    event MarketUpgraded(address indexed proxy, address indexed newImpl);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event MarketPaused(address indexed market);
    event MarketUnpaused(address indexed market);

    error ZeroAddress();
    error InvalidCategory(uint8 provided);
    error EmptyQuestion();
    error NoImplementationSet();
    error UnknownMarket(address market);
    error BatchLengthMismatch();

    function initialize(
        address _owner,
        address _stakeToken,
        address _feeRecipient,
        address _marketImplementation
    ) external initializer {
        __Ownable_init(_owner);
        __Pausable_init();

        if (_stakeToken == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_marketImplementation == address(0)) revert ZeroAddress();

        stakeToken = _stakeToken;
        feeRecipient = _feeRecipient;
        marketImplementation = _marketImplementation;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function createMarket(
        string memory _question,
        uint8 _category,
        uint256 _resolutionDeadline,
        uint256 _minStakeAmount,
        string[] memory _rangeLabels,
        uint256[] memory _lowerBounds,
        uint256[] memory _upperBounds
    ) external onlyOwner whenNotPaused returns (address proxyAddress) {
        if (_category > 2) revert InvalidCategory(_category);
        if (bytes(_question).length == 0) revert EmptyQuestion();
        if (marketImplementation == address(0)) revert NoImplementationSet();

        bytes memory initData = abi.encodeWithSelector(
            RangeFrenzyMarket.initialize.selector,
            address(this),
            stakeToken,
            feeRecipient,
            _question,
            RangeFrenzyMarket.Category(_category),
            _resolutionDeadline,
            _minStakeAmount,
            _rangeLabels,
            _lowerBounds,
            _upperBounds
        );

        ERC1967Proxy proxy = new ERC1967Proxy(marketImplementation, initData);
        proxyAddress = address(proxy);

        allMarkets.push(proxyAddress);
        marketsByCategory[_category].push(proxyAddress);
        isMarket[proxyAddress] = true;

        emit MarketCreated(
            proxyAddress,
            marketImplementation,
            _question,
            _category,
            _resolutionDeadline,
            _minStakeAmount,
            block.timestamp
        );
    }

    function setMarketImplementation(address _newImpl) external onlyOwner {
        if (_newImpl == address(0)) revert ZeroAddress();
        address old = marketImplementation;
        marketImplementation = _newImpl;
        emit ImplementationUpdated(old, _newImpl);
    }

    function upgradeMarket(address _marketProxy, address _newImpl) external onlyOwner {
        if (!isMarket[_marketProxy]) revert UnknownMarket(_marketProxy);
        if (_newImpl == address(0)) revert ZeroAddress();

        RangeFrenzyMarket(_marketProxy).upgradeToAndCall(_newImpl, "");
        emit MarketUpgraded(_marketProxy, _newImpl);
    }

    function resolveMarket(address _market, uint256 _outcome) external onlyOwner {
        _requireKnownMarket(_market);
        RangeFrenzyMarket(_market).resolve(_outcome);
    }

    function batchResolveMarkets(address[] calldata _markets, uint256[] calldata _outcomes)
        external
        onlyOwner
    {
        if (_markets.length != _outcomes.length) revert BatchLengthMismatch();
        for (uint256 i = 0; i < _markets.length; i++) {
            _requireKnownMarket(_markets[i]);
            RangeFrenzyMarket(_markets[i]).resolve(_outcomes[i]);
        }
    }

    function cancelMarket(address _market, string calldata _reason) external onlyOwner {
        _requireKnownMarket(_market);
        RangeFrenzyMarket(_market).cancel(_reason);
    }

    function closeMarketBetting(address _market) external onlyOwner {
        _requireKnownMarket(_market);
        RangeFrenzyMarket(_market).closeBetting();
    }

    function pauseMarket(address _market) external onlyOwner {
        _requireKnownMarket(_market);
        RangeFrenzyMarket(_market).pause();
        emit MarketPaused(_market);
    }

    function unpauseMarket(address _market) external onlyOwner {
        _requireKnownMarket(_market);
        RangeFrenzyMarket(_market).unpause();
        emit MarketUnpaused(_market);
    }

    function setFeeRecipient(address _new) external onlyOwner {
        if (_new == address(0)) revert ZeroAddress();
        address old = feeRecipient;
        feeRecipient = _new;
        emit FeeRecipientUpdated(old, _new);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _requireKnownMarket(address _market) internal view {
        if (!isMarket[_market]) revert UnknownMarket(_market);
    }

    function totalMarkets() external view returns (uint256) {
        return allMarkets.length;
    }

    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    function getMarketsByCategory(uint8 cat) external view returns (address[] memory) {
        return marketsByCategory[cat];
    }

    function getMarketsPage(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        uint256 total = allMarkets.length;
        if (offset >= total || limit == 0) return new address[](0);
        uint256 start = total - 1 - offset;
        uint256 count = (offset + limit > total) ? total - offset : limit;
        page = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = allMarkets[start - i];
        }
    }

    function getMarketsSummary(address[] calldata _markets)
        external
        view
        returns (
            string[] memory questions,
            uint8[] memory categories,
            uint256[] memory deadlines,
            uint8[] memory statuses,
            uint256[] memory pools,
            uint256[] memory numStakers
        )
    {
        uint256 len = _markets.length;
        questions = new string[](len);
        categories = new uint8[](len);
        deadlines = new uint256[](len);
        statuses = new uint8[](len);
        pools = new uint256[](len);
        numStakers = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            RangeFrenzyMarket m = RangeFrenzyMarket(_markets[i]);
            (questions[i], categories[i], deadlines[i], statuses[i], pools[i], numStakers[i], , ) = m
                .getMarketSummary();
        }
    }
}
