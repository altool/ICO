pragma solidity 0.4.15;

// Replace this for the actual code when deploying to the blockchain
import './Drops.sol';

/// @title The ICO contract that will be used to sell the Presale & ICO tokens
/// @author Merunas Grincalaitis <merunasgrincalaitis@gmail.com>
contract Crowdsale is Pausable {
   using SafeMath for uint256;

   // The possible States of the ICO
   enum States {
      NotStarted,
      Presale,
      PresaleEnded,
      ICO,
      ICOEnded
   }

   States public currentState = States.NotStarted;
   Drops public token;
   uint256 public presaleRate;
   uint256 public ICORate;
   uint256 public presaleStartTime;
   uint256 public presaleEndTime;
   uint256 public ICOStartTime;
   uint256 public ICOEndTime;

   // How many tokens we want to raise presale
   uint256 public limitPresaleContribution = 7.5e24;

   // How many tokens we want to raise on the ICO
   uint256 public limitICOContribution = 75e24;
   address public wallet;
   uint256 public weiPresaleRaised;
   uint256 public tokensPresaleRaised;
   uint256 public weiICORaised;
   uint256 public tokensICORaised;
   uint256 public counterPresaleTransactions;
   uint256 public counterICOTransactions;

   // How much each user paid for the presale + ICO
   mapping(address => uint256) public ICOBalances;

   // How many tokens each user got for the presale + ICO
   mapping(address => uint256) public tokenBalances;

   // To indicate who purchased what amount of tokens and who received what amount of wei
   event TokenPurchase(address indexed buyer, uint256 value, uint256 amountOfTokens);

   // Events
   event PresaleStarted();
   event PresaleFinalized();
   event ICOStarted();
   event ICOFinalized();

   // Only allow the execution of the function before the ICO starts or after the presale
   modifier beforeStarting() {
      require(currentState == States.NotStarted || currentState == States.PresaleEnded);
      _;
   }

   // Only after the Presale and ICO
   modifier afterStarting() {
      require(now > presaleEndTime);
      require(currentState == States.PresaleEnded || currentState == States.ICOEnded);
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

   /// @notice The fallback function to buy tokens depending on the States of the
   /// Smart Contract. It reverts if the States is not a valid one to refund the
   /// ether sent to the contract.
   function () public payable {
      updateState();

      if(currentState == States.Presale)
         buyPresaleTokens();
      else if(currentState == States.ICO)
         buyICOTokens();
      else
         revert();
   }

   /// @notice To buy presale tokens using the presale rate
   function buyPresaleTokens() internal whenNotPaused {
      require(validPresalePurchase());

      uint256 tokens = msg.value.mul(presaleRate);

      // If we're exceeding the limit, return the exceeding balance and buy with
      // what you have
      if(tokensPresaleRaised.add(tokens) > limitPresaleContribution) {
         uint256 exceedingTokens = tokensPresaleRaised.add(tokens).sub(limitPresaleContribution);
         uint256 exceedingWei = exceedingTokens.div(presaleRate);

         tokens = tokens.sub(exceedingTokens);
         tokensPresaleRaised = limitPresaleContribution;
         msg.sender.transfer(exceedingWei);
      } else {
         weiPresaleRaised = weiPresaleRaised.add(msg.value);
         tokensPresaleRaised = tokensPresaleRaised.add(tokens);
      }

      counterPresaleTransactions = counterPresaleTransactions.add(1);
      ICOBalances[msg.sender] = ICOBalances[msg.sender].add(msg.value);
      tokenBalances[msg.sender] = tokenBalances[msg.sender].add(tokens);

      // Send the tokens
      token.distributeTokens(msg.sender, tokens);
   }

   /// @notice To buy ICO tokens with the ICO rate
   function buyICOTokens() internal whenNotPaused {
      require(validICOPurchase());

      uint256 tokens = msg.value.mul(ICORate);

      // If we're exceeding the limit, return the exceeding balance and buy with
      // what you have
      if(tokensICORaised.add(tokens) > limitICOContribution) {
         uint256 exceedingTokens = tokensICORaised.add(tokens).sub(limitICOContribution);
         uint256 exceedingWei = exceedingTokens.div(ICORate);

         tokens = tokens.sub(exceedingTokens);
         tokensICORaised = limitICOContribution;
         msg.sender.transfer(exceedingWei);
      } else {
         weiICORaised = weiICORaised.add(msg.value);
         tokensICORaised = tokensICORaised.add(tokens);
      }

      counterICOTransactions = counterICOTransactions.add(1);
      ICOBalances[msg.sender] = ICOBalances[msg.sender].add(msg.value);
      tokenBalances[msg.sender] = tokenBalances[msg.sender].add(tokens);

      // Send the tokens
      token.distributeTokens(msg.sender, tokens);
   }

   /// @notice To set the rates for the presale and ICO by the owner before starting
   /// @param _presaleRate The rate of the presale
   /// @param _ICORate The rate of the ICO
   function setRates(uint256 _presaleRate, uint256 _ICORate) public onlyOwner beforeStarting {
      require(_presaleRate > 0 && _ICORate > 0);

      presaleRate = _presaleRate;
      ICORate = _ICORate;
   }

   /// @notice Updates the States of the Contract depending on the time and States.
   /// After updating the state, the code it's execute again in case you jump from 2 states
   /// or similar
   function updateState() public {
      if(currentState == States.ICOEnded) return;

      if(currentState == States.ICO && now >= ICOEndTime) {
         currentState = States.ICOEnded;
         ICOFinalized();
         updateState();
      } else if(currentState == States.PresaleEnded && now >= ICOStartTime) {
         currentState = States.ICO;
         ICOStarted();
         updateState();
      } else if(currentState == States.Presale && now >= presaleEndTime) {
         currentState = States.PresaleEnded;
         PresaleFinalized();
         updateState();
      } else if(currentState == States.NotStarted && now >= presaleStartTime) {
         currentState = States.Presale;
         PresaleStarted();
         updateState();
      }
   }

   /// @notice To extract the balance of the contract after the presale and ICO only
   function extractFundsRaised() public onlyOwner afterStarting whenNotPaused {
      wallet.transfer(this.balance);
   }

   /// @notice To get the current States as a string
   function getStates() public constant returns(string) {
      if(currentState == States.NotStarted)
         return 'not started';
      else if(currentState == States.Presale)
         return 'presale';
      else if(currentState == States.PresaleEnded)
         return 'presale ended';
      else if(currentState == States.ICO)
         return 'ico';
      else if(currentState == States.ICOEnded)
         return 'ico ended';
   }

   /// @notice To verify that the purchase of presale tokens is valid
   function validPresalePurchase() internal constant returns(bool) {
      bool withinTime = now >= presaleStartTime && now < presaleEndTime;
      bool atLimit = tokensPresaleRaised < limitPresaleContribution;

      return withinTime && atLimit;
   }

   /// @notice To verify that the purchase of ICO tokens is valid
   function validICOPurchase() internal constant returns(bool) {
      bool withinTime = now >= ICOStartTime && now < ICOEndTime;
      bool atLimit = tokensICORaised < limitICOContribution;

      return withinTime && atLimit;
   }
}
