// @flow
import jestSetup from '../jestSetup'

import moment from 'moment'

import {
  getMasterKeyFromMnemonic,
  getAccountFromMasterKey,
  getExternalAddresses,
  getAddressInHex,
  isValidAddress,
  encryptData,
  decryptData,
  formatBIP44,
  signTransaction,
} from './util'

import {InsufficientFunds} from './errors'

import longAddress from './__fixtures/long_address.json'

import {CARDANO_CONFIG, CONFIG} from '../config'

jestSetup.setup()

const mnemonic = [
  'panic advice priority develop',
  'solid remind ankle shock',
  'include oyster profit reopen',
  'acid pole crisp',
].join(' ')

const externalAddresses = [
  '2cWKMJemoBakWtKxxsZpnEhs3ZWRf9tG3R9ReJX6UsAGiZP7PBpmutxYPRAakqEgMsK1g',
  '2cWKMJemoBahkhQS5QofBQxmsQMQDTxv1xzzqU9eHXBx6aDxaswBEksqurrfwhMNTYVFK',
]

// getExternalAddresses
test('Can generate external addresses', async () => {
  expect.assertions(1)

  const masterKey = await getMasterKeyFromMnemonic(mnemonic)
  const account = await getAccountFromMasterKey(
    masterKey,
    CONFIG.WALLET.ACCOUNT_INDEX,
    CARDANO_CONFIG.TESTNET.PROTOCOL_MAGIC,
  )
  const addresses = await getExternalAddresses(
    account,
    [0, 1],
    CONFIG.CARDANO.PROTOCOL_MAGIC,
  )

  expect(addresses).toEqual(externalAddresses)
})

// getAddressInHex
test('Can convert address to hex', () => {
  const address = externalAddresses[0]
  // prettier-ignore
  // eslint-disable-next-line max-len
  const hex = '82d818582883581ccaf8a28e2472376b06ded6fe04c2324e56b5dceba78f7fc8603f4949a102451a4170cb17001a1aeeab5f'
  expect(getAddressInHex(address)).toEqual(hex)
})

test('Throws error when converting bad address', () => {
  expect(() => getAddressInHex('&*')).toThrow()
})

// isValidAddress
test('Can validate valid addresses', async () => {
  expect.assertions(externalAddresses.length)
  for (const address of externalAddresses) {
    const isValid = await isValidAddress(address)
    expect(isValid).toBe(true)
  }
})

// isValidAddress
test('Can validate long address', async () => {
  expect.assertions(1)
  const isValid = await isValidAddress(longAddress)
  expect(isValid).toBe(true)
})

test('Can validate invalid addresses', async () => {
  const addresses = [
    // should be invalid
    'Ae2tdPwUPEZKAx4zt8YLTGxrhX9L6R8QPWNeefZsPgwaigWab4mEw1ECUZ6',
    'Ae2tdPwUPEZKAx4zt8YLTGxrhX9L6R8QPWNeefZsPgwaigWab4mEw1ECUZ', // too short
    'Ae2tdPwUPEZKAx4zt8YLTGxrhX9L6R8QPWNeefZsPgwaigWab4mEw1ECUZ77', // too long
    '',
    'bad',
    'badChars&*/',
    '1234',
  ]
  expect.assertions(addresses.length)
  for (const address of addresses) {
    const isValid = await isValidAddress(address)
    expect(isValid).toBe(false)
  }
})

test('Can encrypt / decrypt masterKey', async () => {
  expect.assertions(1)
  const masterKey = await getMasterKeyFromMnemonic(mnemonic)
  const encryptedKey = await encryptData(masterKey, 'password')
  const decryptedKey = await decryptData(encryptedKey, 'password')

  expect(masterKey).toEqual(decryptedKey)
})

test('Make sure that we are using safe buffers', () => {
  // in response to https://github.com/nodejs/node/issues/4660
  expect(new Buffer(10).toString('hex')).toBe('00000000000000000000')
})

test('Can format address', () => {
  expect(formatBIP44(42, 'Internal', 47)).toBe("m/44'/1815'/42'/1/47")
})

describe('signTransaction', () => {
  const wallet = require('./__fixtures/fake_wallet.json')
  const inputs = require('./__fixtures/transaction_inputs.json')
  const outputAddress =
    'Ae2tdPwUPEZAghGCdQykbGxc991wdoA8bXmSn7eCGuUKXF4EsRhWj4PJitn'
  const change = 'Ae2tdPwUPEZJcamJUVWxJEwR8rj5x74t3FkUFDzKEdoL8YSyeRdwmJCW9c3'

  it('can sign small amount', async () => {
    expect.assertions(1)

    const outputs = [
      {
        address: outputAddress,
        value: '100',
      },
    ]

    const tx = await signTransaction(wallet, inputs, outputs, change)
    expect(tx).not.toBeNull()
  })

  it('can sign large amount', async () => {
    expect.assertions(1)

    const outputs = [
      {
        address: outputAddress,
        value: '15097900',
      },
    ]

    const tx = await signTransaction(wallet, inputs, outputs, change)
    expect(tx).not.toBeNull()
  })

  it('can sign even larger amount', async () => {
    expect.assertions(1)
    const outputs = [
      {
        address: outputAddress,
        value: '15098915',
      },
    ]

    const tx = await signTransaction(wallet, inputs, outputs, change)
    expect(tx).not.toBeNull()
  })

  it('throws InsuffiecientFunds', async () => {
    expect.assertions(1)
    const outputs = [
      {
        address: outputAddress,
        value: '25000000',
      },
    ]

    const promise = signTransaction(wallet, inputs, outputs, change)
    await expect(promise).rejects.toBeInstanceOf(InsufficientFunds)
  })

  it('can handle rust bug', async () => {
    expect.assertions(1)

    const outputs = [
      {
        address: outputAddress,
        value: '15096900',
      },
    ]

    const promise = signTransaction(wallet, inputs, outputs, change)
    await expect(promise).not.toBeNull()
  })

  it('can handle big amounts', async () => {
    expect.assertions(1)
    const outputs = [
      {
        address: outputAddress,
        value: '11111111111111000000',
      },
    ]

    const promise = signTransaction(wallet, inputs, outputs, change)
    await expect(promise).rejects.toBeInstanceOf(InsufficientFunds)
  })

  it('can handle insanely huge amounts', async () => {
    expect.assertions(1)
    const outputs = [
      {
        address: outputAddress,
        value: '1234567891234567890123456789000000',
      },
    ]

    const promise = signTransaction(wallet, inputs, outputs, change)
    await expect(promise).rejects.toBeInstanceOf(InsufficientFunds)
  })

  it('can handle multiple big amounts', async () => {
    expect.assertions(1)
    const outputs = [
      {
        address: outputAddress,
        value: '44000000000000000',
      },
      {
        address: outputAddress,
        value: '44000000000000000',
      },
    ]

    const promise = signTransaction(wallet, inputs, outputs, change)
    await expect(promise).rejects.toBeInstanceOf(InsufficientFunds)
  })

  // Note(ppershing): This is a known bug in rust-cardano implementation
  // and we can do nothing with it
  // Let's hope this test fails (with correct behavior) in the future
  it('can compute correct fee', async () => {
    expect.assertions(2)
    // If this fails, it means we let this bug open for too long time.
    // Try updating rust library and seeing if it disappears
    // Note(v-almonacid): I increased this timer. We'll hopefully update the
    // bindings within the the next months and this issue should be fixed by then©
    expect(moment().isBefore('2019-12-01')).toBeTruthy()

    const inputs = [
      {
        ptr: {
          id:
            '0cd1ec4dce33c7872c3e090c88e9af2fc56c4d7fba6745d15d4fce5e1d4620ba',
          index: 0,
        },
        value: {
          address:
            'Ae2tdPwUPEYxoQwHKy1BEiuFLBtHEAtertUUijFeZMFg9NeaW6N1nWbb7T9',
          value: '5000000',
        },
        addressing: {account: 0, change: 0, index: 0},
      },
    ]

    const outputs = [
      {
        address: outputAddress,
        value: '4832139',
      },
    ]

    const result = await signTransaction(wallet, inputs, outputs, change)
    const fee = result.fee.toNumber()
    // Note(ppershing): When building the transaction
    // the best solution is to have 2 outputs:
    // 1) output address with 4832139 uADA (micro ADA)
    // 2) change address with 23 uADA
    // This leads to tx with 283 bytes requiring *minimum* fee of 167818.
    // Note that such Tx will have bigger fee because we failed to include
    // additional 20 uADA. This is a consequence of fact that CBOR encoding of
    // value >=24 is one byte longer than 23. Thus we would require additional
    // 43 uADA in fees
    const BAD_FEE = 167818
    expect(fee).toEqual(BAD_FEE)

    // This is minimum feasible fee for the transaction
    // const GOOD_FEE = 167838
    // expect(fee).toBeGreaterThanOrEqual(GOOD_FEE)
  })
})
