pragma solidity 0.4.15;

// Replace this for the actual code when deploying to the blockchain
import './Drops.sol';

// TODOS
// Set the default startime and endtime of the presale and ico in the variables
// Constructor set the token, presaleStartTime, presaleEndTime, ICOStartTime, ICOEndTime

/// @title The crowdsale contract that will be used to sell the Presale & ICO tokens
/// @author Merunas Grincalaitis <merunasgrincalaitis@gmail.com>
contract Crowdsale {
   using SafeMath for uint256;

   // The possible states of the ICO
   enum State {
      NotStarted,
      Presale,
      PresaleEnded,
      ICO
   }

   State public currentState = State.NotStarted;
   Drops public token;
   uint256 public presaleRate;
   uint256 public ICORate;
   uint256 public presaleStartTime;
   uint256 public presaleEndTime;
   uint256 public ICOStartTime;
   uint256 public ICOEndTime;
   uint256 public limitPresaleContribution = 7.5e24;
   uint256 public limitCrowdsaleContribution = 75e24;
   address public wallet;
   uint256 public weiRaised;
   uint256 public tokensRaised;
   uint256 public counterPresaleTransactions;
   uint256 public counterICOTransactions;
   uint256 public minPurchase = 100 finney;
   uint256 public maxPurchase = 2000 ether;
   bool public isEnded = false;

   // How much each user paid for the crowdsale
   mapping(address => uint256) public crowdsaleBalances;

   // How many tokens each user got for the crowdsale
   mapping(address => uint256) public tokensBought;

   // To indicate who purchased what amount of tokens and who received what amount of wei
   event TokenPurchase(address indexed buyer, uint256 value, uint256 amountOfTokens);

   // Events
   event PresaleStarted();
   event PresaleFinalized();
   event ICOStarted();
   event ICOFinalized();

   // Only allow the execution of the function before the crowdsale starts
   modifier beforePresale() {
      require(now < presaleStartTime);
      require(currentState == State.NotStarted);
      _;
   }

   // To only allow the execution of the function before the ICO
   modifier beforeICO() {
      require(now < ICOStartTime);
      require(currentState == State.PresaleEnded);
      _;
   }

   /// @notice Constructor of the crowsale to set up the main variables and create a token
   /// @param _wallet The wallet address that stores the Wei raised
   /// @param _tokenAddress The token used for the ICO
   /// @param _presaleStartTime When the presale should start. If it's 0, we'll use
   /// the default value of the variable set above
   /// @param _presaleEndTime When the presale should end. If it's 0, we'll use the
   /// default value of the variable
   /// @param _ICOStartTime When the ICO should start. If it's 0, we'll use
   /// the default value of the variable set above
   /// @param _ICOEndTime When the ICO should end. If it's 0, we'll use the
   /// default value of the variable
   function Crowdsale(
      address _wallet,
      address _tokenAddress,
      uint256 _presaleStartTime,
      uint256 _presaleEndTime,
      uint256 _ICOStartTime,
      uint256 _ICOEndTime
   ) public {
      require(_wallet != address(0));
      require(_tokenAddress != address(0));

      // If you send the start and end time on the constructor, the end must be larger
      if(_presaleStartTime > 0 && _presaleEndTime > 0)
         require(_presaleStartTime < _presaleEndTime);

      if(_ICOStartTime > 0 && _ICOEndTime > 0)
         require(_ICOStartTime < _ICOEndTime);

      wallet = _wallet;
      token = Drops(_tokenAddress);

      if(_presaleStartTime > 0)
         presaleStartTime = _presaleStartTime;

      if(_presaleEndTime > 0)
         presaleEndTime = _presaleEndTime;

      if(_ICOStartTime > 0)
         ICOStartTime = _ICOStartTime;

      if(_ICOEndTime > 0)
         ICOEndTime = _ICOEndTime;
   }

   /// @notice The fallback function to buy tokens depending on the state of the
   /// Smart Contract. It throws if the state is not presale or ICO
   function () public payable {
      require(currentState == State.Presale || currentState == State.ICO);

      if(currentState == State.Presale)
         buyPresaleTokens();
      else if(currentState == State.ICO)
         buyICOTokens();
   }

   /// @notice To buy presale tokens using the presale rate
   function buyPresaleTokens() internal {
      // TODO
   }

   /// @notice To buy ICO tokens with the ICO rate
   function buyICOTokens() internal {
      // TODO
   }
}