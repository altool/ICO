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
      crowdsale = await Crowdsale.new(wallet, drops.address, this.presaleStartTime, this.presaleEndTime, this.ICOStartTime, this.ICOEndTime)
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

	describe('accepting payments',() => {
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

		it('should accept payments after start',() => {
			return new Promise(async (resolve,reject) => {
				increaseTimeTo(this.presaleStartTime)
				// try {

               // You have to send ether directly, because the buy functions are internal
               // to revert transactions when the ICO is ended
					await web3.eth.sendTransaction({
                  from: web3.eth.accounts[0],
                  to: crowdsale.address,
                  amount: web3.toWei(0.1, 'ether')
               })
				// } catch(e) {
				// 	return reject() // this is not the case
				// }

				resolve() // there shouldn't be any exception
			})
		})

		it('should reject after end',() => {
			return new Promise(async (resolve,reject)=>{
			    increaseTimeTo(this.presaleEndTime)
				try{
					await crowdsale.buyPresaleTokens()
				}catch(e){
					return resolve() // this is the  case to be handled
				}
				reject() // there should be any exception
			})
		})

		it('should reject ico payments before ico start time',()=>{
			return new Promise(async (resolve,reject)=>{
				try{
					await crowdsale.buyICOtokens()
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
					await crowdsale.buyICOtokens()
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
					await crowdsale.buyICOtokens()
				}catch(e){
					return resolve() // this is the  case to be handled
				}
				reject() // there should be any exception
			})
		})
	})

	describe('accepting payments based on paused', () => {
		it('should not accept payments on pause',() => {
			return new Promise(async (resolve,reject) => {
				await drops.pause()
		        const isPaused = await drops.paused()
		        assert.ok(isPaused, "The contract should be pausable by the owner")

		        try{
		        	await crowdsale.buyPresaleTokens()
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
		        	await crowdsale.buyICOtokens()
		        }catch(e){
		        	return resolve() // payments should not be allowed on pause
		        }

		        reject() // there must be a exception
			})
		})

	})
})
