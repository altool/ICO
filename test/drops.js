const assert = require('assert')
const Drops = artifacts.require('Drops')
const totalSupply = 67.5e24
const symbol = 'AQUA'

// The token instance
let drops
let ICOEndTime = String(new Date().getTime()).substring(0, String(new Date().getTime()).length - 3)

// How transferFrom works:
// You send ether _to a contract from the ether the _owner allowed _you to use
contract('Drops', accounts => {

   // Deploy the token every new test
   beforeEach(async () => {
      drops = await Drops.new(ICOEndTime)
   })

   it("Should set the total supply to the initial supply", () => {
      return new Promise(async (resolve, reject) => {
         const currentTotalSupply = await drops.totalSupply()

         assert.equal(currentTotalSupply, totalSupply, "The total supply isn't correcly set")
         resolve()
      })
   })
   it("Should have the correct symbol", () => {
      return new Promise(async (resolve, reject) => {
         const currentSymbol = await drops.symbol()

         assert.equal(currentSymbol, symbol, "The symbol isn't propertly set")
         resolve()
      })
   })
   it("Should set the right owner", () => {
      return new Promise(async (resolve, reject) => {
         const currentOwner = await drops.owner()

         assert.equal(currentOwner, accounts[0], "The owner isn't propertly set")
         resolve()
      })
   })
   it("Should give all the supply to the owner to distribute it later", () => {
      return new Promise(async (resolve, reject) => {
         const ownerBalance = await drops.balanceOf(accounts[0])

         assert.equal(ownerBalance, totalSupply, "The balance of the owner isn't the total supply")
         resolve()
      })
   })
   it("Should make 100 Drops allowances and transfers to another user", () => {
      return new Promise(async (resolve, reject) => {
         const dropsOwner = accounts[0]
         const allowedDropsOwner = accounts[1]
         const additionalUser = accounts[2]
         const amount = 100

         await drops.approve(allowedDropsOwner, amount, {
            from: dropsOwner
         })
         const initialAllowance = await drops.allowance(dropsOwner, allowedDropsOwner)
         assert.ok(initialAllowance.eq(amount), "The allowance isn't correct")

         // You can't transferFrom to the original address since that would be like
         // transfering ether to yourself from yourself which is impossible
         await drops.transferFrom(dropsOwner, additionalUser, amount, {
            from: allowedDropsOwner
         })
         const finalAllowance = await drops.allowance(dropsOwner, allowedDropsOwner)

         assert.ok(finalAllowance.eq(0), "The final allowance isn't correct")
         resolve()
      })
   })
   it("Should make 100 Drops allowances and transfers to another contract", () => {
      return new Promise(async (resolve, reject) => {
         const dropsOwner = accounts[0]
         const allowedDropsOwner = accounts[1]
         const contract = 0xf923Ba61B43161A83afe2cAb7d77Ea1e41F27918
         const amount = 100

         await drops.approve(allowedDropsOwner, amount, {
            from: dropsOwner
         })
         const initialAllowance = await drops.allowance(dropsOwner, allowedDropsOwner)
         assert.ok(initialAllowance.eq(amount), "The allowance isn't correct")

         // You can't transferFrom to the original address since that would be like
         // transfering ether to yourself from yourself which is impossible
         await drops.transferFrom(dropsOwner, contract, amount, {
            from: allowedDropsOwner
         })
         const finalAllowance = await drops.allowance(dropsOwner, allowedDropsOwner)

         assert.ok(finalAllowance.eq(0), "The final allowance isn't correct")
         resolve()
      })
   })
   it("Should be pausable by the owner when not paused", () => {
      return new Promise(async (resolve, reject) => {
         const isPaused = await drops.paused()
         assert.ok(!isPaused, "The contract shouldn't be paused by default")

         await drops.pause({
            from: accounts[0]
         })
         const isPaused2 = await drops.paused()
         assert.ok(isPaused2, "The contract should be pausable by the owner")

         resolve()
      })
   })
   it("Should be resumed by the owner when paused", () => {
      return new Promise(async (resolve, reject) => {
         await drops.pause({
            from: accounts[0]
         })
         const isPaused = await drops.paused()
         assert.ok(isPaused, "The contract should be pausable by the owner")

         await drops.unpause({
            from: accounts[0]
         })
         const isPaused2 = await drops.paused()
         assert.ok(!isPaused2, "The contract should be unpausable by the owner")

         resolve()
      })
   })
   it("Should not allow to make transfers while paused", () => {
      return new Promise(async (resolve, reject) => {
         const from = accounts[0]
         const to = accounts[1]
         const amount = 100
         const initialBalance = await drops.balanceOf(from)

         await drops.pause({
            from: from
         })
         const isPaused = await drops.paused()
         assert.ok(isPaused, "The contract should be pausable by the owner")

         try {
            await drops.transfer(to, amount, {
               from: from
            })
         } catch(e) {
            const finalBalance = await drops.balanceOf(from)
            assert.ok(finalBalance.eq(initialBalance), "The final balance should remain unchange since the tranfers are blocked")

            return resolve()
         }

         // If there's no exception it means that the transfer was executed which isn't the case
         reject()
      })
   })
   it("Should not allow to make allowances while paused", () => {
      return new Promise(async (resolve, reject) => {
         const owner = accounts[0]
         const allowedUser = accounts[1]
         const amount = 100
         const initialAllowance = await drops.allowance(owner, allowedUser)

         await drops.pause({
            from: owner
         })
         const isPaused = await drops.paused()
         assert.ok(isPaused, "The contract should be pausable by the owner")

         try {
            await drops.approve(allowedUser, amount, {
               from: owner
            })
         } catch(e) {
            const finalAllowance = await drops.allowance(owner, allowedUser)
            assert.ok(finalAllowance.eq(initialAllowance), "The final allowance should remain unchange since the approvals are blocked")

            return resolve()
         }

         reject()
      })
   })
   it("Should be able to transfer the ownership to another user by the owner", () => {
      return new Promise(async (resolve, reject) => {
         const owner = await drops.owner()
         const newOwner = accounts[1]

         await drops.transferOwnership(newOwner, {
            from: owner
         })

         const finalOwner = await drops.owner()

         assert.equal(finalOwner, newOwner, "The new owner should change after the transfer ownership")

         resolve()
      })
   })
})
