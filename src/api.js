const axios = require('axios')
const querystring = require('querystring')
const crypto = require('crypto')

const env = require('../env')
const apiUrl = env.API_URL
const apiKey = env.API_KEY
const apiSecret = env.API_SECRET

const symbol = env.SYMBOL
const interval = env.CANDLE_INTERVAL

async function privateCall(path, data = {}, method = 'GET') {
  const timestamp = (await publicCall('/v1/time')).serverTime
  const signature = crypto.createHmac('sha256', apiSecret)
    .update(`${querystring.stringify({ ...data, timestamp })}`)
    .digest('hex');

  const newData = { ...data, timestamp, signature }
  const qs = `?${querystring.stringify(newData)}`

  try {
    const response = await axios({
      method,
      url: `${apiUrl}${path}${qs}`,
      headers: { 'X-MBX-APIKEY': apiKey }
    })

    return response.data
  }catch (err) {
    console.log(err)
    return null
  }

}

async function publicCall(path, data, method = 'GET') {
  try {
    const qs = data ? `?${querystring.stringify(data)}` : ''
    const response = await axios({
      method,
      url: `${apiUrl}${path}${qs}`
    })

    return response.data
  }catch (err) {
    //console.log(err)
    return null
  }
}

async function time() {
  return publicCall('/v1/time')
}

async function candles() {
  try {
    const candles = await publicCall('/v1/klines', { symbol, interval })

    const data = []

    candles.forEach(candle => {
      data.push({
        open_time: candle[0],
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        close_time: candle[6]
      })
    });

    return(data)
  }catch (err) {
    return null
  }
}

async function leverage({ leverage }) {
  try {
    const data = { symbol, leverage }

    return privateCall('/v1/leverage', data, 'POST')
  }catch (err) {
    console.log(err)
    return null;
  }
}

async function balance({ symbol }) {
  try {
    const response = await privateCall('/v2/balance')

    let balance = 0
    response.map((carteira) => {
      if(carteira.asset === symbol) {
        balance = Number(carteira.balance).toFixed(2)
      }
    })
    return balance
  }catch (err) {
    return null
  }
}

async function newOrderLimit({ side, quantity, price }) {
  const data = { 
    symbol,
    quantity,
    price,
    side,
    type: 'LIMIT',
    positionSide: 'BOTH',
    timeInForce: 'GTC',
    reduceOnly: false,
    // workingType: 'MARK_PRICE'
    
  }

  return privateCall('/v1/order', data, 'POST')
}

async function getOrder({ orderId }) {
  try {
    const orders = await privateCall('/v1/allOrders', { symbol, limit: 1000 })

    let orderResponse = {}
    orders.forEach(order => {
      if(order.orderId === orderId) {
        orderResponse = order
      }
    });
    return orderResponse
  }catch (err) {
    return null
  }
}

async function newOrderStopTakeMarket({ side, stopPrice, quantity }) {
  const data = {
    symbol,
    side,
    stopPrice,
    quantity,
    type: 'TAKE_PROFIT_MARKET',
    positionSide: 'BOTH',
    timeInForce: 'GTE_GTC',
    reduceOnly: true,
    // workingType: 'MARK_PRICE'
    
  }

  return privateCall('/v1/order', data, 'POST')
}

async function cancelAllOrders() {
  return await privateCall('/v1/allOpenOrders', { symbol }, 'DELETE')
}

module.exports = { candles, leverage, balance, newOrderLimit, getOrder, newOrderStopTakeMarket, cancelAllOrders }
