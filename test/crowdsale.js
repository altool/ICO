const assert = require('assert')
const Drops = artifacts.require('Drops')
const Crowdsale = artifacts.require('Crowdsale')

// The token & ICO instance
let drops
let crowdsale

// Returns the number of days in seconds to add to the timestamp
function days(numberOfDays) {
   return 60 * 60 * 24 * numberOfDays
}

function increaseTimeTo(target){
   let now = web3.eth.getBlock('latest').timestamp;
   if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);

   let diff = target - now;
   web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [diff],
      id: 0
   })
   web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })
}

// How transferFrom works:
// You send tokens _to a contract from the tokens the _owner allowed _you to use
contract('Crowdsale', function([tokenAddress, investor, wallet, purchaser]){

   // Deploy the token every new test
   beforeEach(async () => {
      this.presaleStartTime = web3.eth.getBlock('latest').timestamp + days(7)
      this.presaleEndTime = this.presaleStartTime + days(7)
      this.ICOStartTime = this.presaleEndTime + days(7)
      this.ICOEndTime = this.ICOStartTime + days(7)

      drops = await Drops.new(this.ICOEndTime)
      crowdsale = await Crowdsale.new(web3.eth.accounts[0], drops.address, this.presaleStartTime, this.presaleEndTime, this.ICOStartTime, this.ICOEndTime)

      // You can set the rates whenever you want to use the most convinient rate
      // at the time of the presale and ICO since the price of ether change constantly
      await crowdsale.setRates(5000, 2000)

      // You have to set the address of the crowdsale to be able to distribute tokens
      // by the crowdsale and to block people from transfering them until the end of the ICO
      await drops.setCrowdsaleAddress(crowdsale.address)
   })

   it("the get states function return value should match with current state value",()=> {
		return new Promise(async (resolve,reject) => {
			assert.equal('not started', await crowdsale.getStates()," the get states function is not working properly")
			resolve()
		})
	})

   it("the updateState() function should work based on timestamp to activate the presale",()=>{
      return new Promise(async (resolve,reject) => {
         increaseTimeTo(this.presaleStartTime)
         await crowdsale.updateState()
         const updatedState = await crowdsale.getStates()

         assert.equal(updatedState, 'presale', "the update state function is wrong")
         resolve()
      })
   })

   it("the extractFundsRaised() modified should work based on timestamp and only owner and not paused",() => {
	   	return new Promise(async (resolve, reject) => {
	   		increaseTimeTo(this.ICOStartTime)
	   		await crowdsale.updateState()
	   		await drops.pause()
	        const isPaused = await drops.paused()
	        assert.ok(isPaused, "The contract should be pausable by the owner") // this satisfies owner and pausable condition

	   		try{
	   			await crowdsale.extractFundsRaised()
	   		}catch(e){
	   			return resolve()
	   		}
	   		reject() // there should be exception
	   	})
   })

   it('setRates() function should reject after starting',() =>{
   		return new Promise(async (resolve, reject) => {
   			increaseTimeTo(this.ICOStartTime)
   			await crowdsale.updateState()
   			try{
   				await crowdsale.setRates(5000,2000)
   			}catch(e){
   				return resolve()
   			}

   			reject()
   		})
   })


   it("the updateState() function should work based on timestamp to end the presale",()=>{
		return new Promise(async (resolve,reject) => {
         increaseTimeTo(this.presaleEndTime)
         await crowdsale.updateState()
			const updatedState = await crowdsale.getStates()

			assert.equal(updatedState, 'presale ended', "the update state function is wrong")
         resolve()
		})
	})

   it("the updateState() function should work based on timestamp to start the ICO",()=>{
		return new Promise(async (resolve,reject) => {
         increaseTimeTo(this.ICOStartTime)
         await crowdsale.updateState()
			const updatedState = await crowdsale.getStates()

			assert.equal(updatedState, 'ico', "the update state function is wrong")
         resolve()
		})
	})

   it("the updateState() function should work based on timestamp to end the ICO",()=>{
      return new Promise(async (resolve,reject) => {
         increaseTimeTo(this.ICOEndTime)
         await crowdsale.updateState()
         const updatedState = await crowdsale.getStates()

         assert.equal(updatedState, 'ico ended', "the update state function is wrong")
         resolve()
      })
   })

	describe('Payments',() => {
		it('should reject payments before start',() => {
			return new Promise(async (resolve,reject) => {
				try {
					await crowdsale.buyPresaleTokens()
				} catch(e) {
					return resolve()
				}

				reject() // if there is no exception then something's wrong
			})
		})

      it('should not allow token transfers for users until the end of the ICO', () => {

      })

		it('should accept payments after starting the presale',() => {
			return new Promise(async (resolve,reject) => {
				increaseTimeTo(this.presaleStartTime)

				try {

               // You have to send ether directly, because the buy functions are internal
               // to revert transactions when the ICO is ended. So it's only possible
               // to execute them from the fallback function
					await web3.eth.sendTransaction({
                  from: web3.eth.accounts[1],
                  to: crowdsale.address,
                  value: web3.toWei(1, 'ether'),
                  gas: 4e6
               })
				} catch(e) {
				 	return reject() // this is not the case
				}

				resolve() // there shouldn't be any exception
			})
		})

		it('should reject payments after the end of the presale',() => {
			return new Promise(async (resolve,reject)=>{
			   increaseTimeTo(this.presaleEndTime)

				try{
               await web3.eth.sendTransaction({
                  from: web3.eth.accounts[1],
                  to: crowdsale.address,
                  value: web3.toWei(1, 'ether'),
                  gas: 4e6
               })
				}catch(e){
					return resolve() // this is the case to be handled
				}
				reject() // there should be any exception
			})
		})

		it('should reject ico payments before ico start time',()=>{
			return new Promise(async (resolve,reject)=>{
				try{
               await web3.eth.sendTransaction({
                  from: web3.eth.accounts[1],
                  to: crowdsale.address,
                  value: web3.toWei(1, 'ether'),
                  gas: 4e6
               })
				}catch(e){
					return resolve()
				}

				reject() // there must be an exception
			})
		})

		it('should accept payments after ico start time',() => {
			return new Promise(async (resolve,reject)=>{
				increaseTimeTo(this.ICOStartTime)
				try{
               await web3.eth.sendTransaction({
                  from: web3.eth.accounts[1],
                  to: crowdsale.address,
                  value: web3.toWei(1, 'ether'),
                  gas: 4e6
               })
				}catch(e){
					return reject() // this is not the case
				}
				resolve() // there shouldn't be any exception
			})
		})

		it('should reject after ICO end',() => {
			return new Promise(async (resolve,reject)=>{
			    increaseTimeTo(this.ICOEndTime)
				try{
               await web3.eth.sendTransaction({
                  from: web3.eth.accounts[1],
                  to: crowdsale.address,
                  value: web3.toWei(1, 'ether'),
                  gas: 4e6
               })
				}catch(e){
					return resolve() // this is the  case to be handled
				}
				reject() // there should be any exception
			})
		})

		it('should extract funds to wallet', () => {
			return new Promise(async (resolve,reject) => {
				increaseTimeTo(this.ICOEndTime)
		   		await crowdsale.updateState()
		   		const pre = web3.eth.getBalance(wallet)
		   		try{

		   			// Do one transaction add buyICOtoken or presale token then this.balance
		   			// will be updated and this testcase will be considered as tested correctly
		   			await crowdsale.extractFundsRaised()
		   		}catch(e){
		   			console.log(e)
		   			return reject()
		   		}
		   		const post = web3.eth.getBalance(wallet)
		   		assert.notEqual(post,pre, "extractFundsRaised not working fine")
		   		resolve()
	   		})
		})

      it("Should buy 5 million tokens for 1000 ether at rate 5000 at the presale", () => {
         return new Promise(async (resolve, reject) => {
            const amountToBuy = web3.toWei(1000, 'ether')
            const initialTokenBalance = parseFloat(await drops.balanceOf(web3.eth.accounts[2]))
            const expectedTokens = 5e24

            increaseTimeTo(this.presaleStartTime)
            await web3.eth.sendTransaction({
               from: web3.eth.accounts[2],
               to: crowdsale.address,
               value: amountToBuy,
               gas: 4e6
            })

            const tokensRaised = parseFloat(await crowdsale.tokensPresaleRaised())
            const finalTokenBalance = parseFloat(await drops.balanceOf(web3.eth.accounts[2]))

            assert.equal(tokensRaised, expectedTokens, 'The tokens raised aren\'t correct')
            assert.equal(finalTokenBalance, initialTokenBalance + expectedTokens, "The balance is not correct")
            resolve()
         })
      })

      it("Should buy the maximum 7.5 million tokens for 1500 ether at rate 5000 at the presale", () => {
         return new Promise(async (resolve, reject) => {
            const amountToBuy = web3.toWei(1500, 'ether')
            const account = web3.eth.accounts[2]
            const initialTokenBalance = parseFloat(await drops.balanceOf(account))
            const expectedTokens = 7.5e24

            increaseTimeTo(this.presaleStartTime)
            await web3.eth.sendTransaction({
               from: account,
               to: crowdsale.address,
               value: amountToBuy,
               gas: 4e6
            })

            const tokensRaised = parseFloat(await crowdsale.tokensPresaleRaised())
            const finalTokenBalance = parseFloat(await drops.balanceOf(account))

            assert.equal(tokensRaised, expectedTokens, 'The tokens raised aren\'t correct')
            assert.equal(finalTokenBalance, initialTokenBalance + expectedTokens, "The balance is not correct")
            resolve()
         })
      })

      // If you send more than the maximum in the presale, the contract should refund the rest unused
      it("Should buy more than the maximum and limit the purchase to 7.5 million tokens for 3000 ether at rate 5000 at the presale", () => {
         return new Promise(async (resolve, reject) => {
            const amountToBuy = web3.toWei(3000, 'ether')
            const account = web3.eth.accounts[2]
            const initialTokenBalance = parseFloat(await drops.balanceOf(account))
            const expectedTokens = 7.5e24

            increaseTimeTo(this.presaleStartTime)
            await web3.eth.sendTransaction({
               from: account,
               to: crowdsale.address,
               value: amountToBuy,
               gas: 4e6
            })

            const tokensRaised = parseFloat(await crowdsale.tokensPresaleRaised())
            const finalTokenBalance = parseFloat(await drops.balanceOf(account))

            assert.equal(tokensRaised, expectedTokens, 'The tokens raised aren\'t correct')
            assert.equal(finalTokenBalance, initialTokenBalance + expectedTokens, "The balance is not correct")
            resolve()
         })
      })

      // If you send more than the maximum in the presale, the contract should refund the rest unused
      it("Should refund the unused tokens when buying more than the maximum for the presale for 3000 ether at rate 5000 at the presale", () => {
         return new Promise(async (resolve, reject) => {
            const amountToBuy = web3.toWei(3000, 'ether')
            const account = web3.eth.accounts[2]
            const initialBalance = parseFloat(await web3.eth.getBalance(account))
            const initialTokenBalance = parseFloat(await drops.balanceOf(account))
            const expectedTokens = 7.5e24
            const limitEtherPresale = web3.toWei(1500, 'ether')

            increaseTimeTo(this.presaleStartTime)
            await web3.eth.sendTransaction({
               from: account,
               to: crowdsale.address,
               value: amountToBuy,
               gas: 4e6
            })

            const tokensRaised = parseFloat(await crowdsale.tokensPresaleRaised())
            const finalBalance = parseFloat(await web3.eth.getBalance(account))
            const finalTokenBalance = parseFloat(await drops.balanceOf(account))

            assert.equal(tokensRaised, expectedTokens, 'The tokens raised aren\'t correct')
            assert.equal(finalTokenBalance, initialTokenBalance + expectedTokens, "The token balance is not correct")
            assert.equal(finalBalance, initialBalance - limitEtherPresale, 'The user balance is not correct')
            resolve()
         })
      })

   })

	describe('Payments paused', () => {
		it('should not accept payments on pause',() => {
			return new Promise(async (resolve,reject) => {
				await drops.pause()
		        const isPaused = await drops.paused()
		        assert.ok(isPaused, "The contract should be pausable by the owner")

		        try{
                 await web3.eth.sendTransaction({
                    from: web3.eth.accounts[1],
                    to: crowdsale.address,
                    value: web3.toWei(1, 'ether'),
                    gas: 4e6
                 })
		        }catch(e){
		        	return resolve() // payments should not be allowed on pause
		        }

		        reject() // there must be a exception
			})
		})

		it('should not accept payments on pause for ICO',() => {
			return new Promise(async (resolve,reject) => {
				await drops.pause()
		        const isPaused = await drops.paused()
		        assert.ok(isPaused, "The contract should be pausable by the owner")

		        try{
                 await web3.eth.sendTransaction({
                    from: web3.eth.accounts[1],
                    to: crowdsale.address,
                    value: web3.toWei(1, 'ether'),
                    gas: 4e6
                 })
		        }catch(e){
		        	return resolve() // payments should not be allowed on pause
		        }

		        reject() // there must be a exception
			})
		})

	})
})
