const api = require('./api')
const { rsi } = require('./indicators/rsi')
const { addMinutes } = require('date-fns')

const env = require('../env');
const leverage = env.LEVERAGE;
const limite_entrada = env.LIMITE_ENTRADA;
const long_rsi = env.LONG_RSI;
const short_rsi = env.SHORT_RSI;
const profit = env.PROFIT;
const divisor = env.DIVISOR;

let linhaLimite = 0
let orderEntrada = 0
let orderProfit = 0

let long = false
let short = false

setInterval(async () => {
  const prices = await api.candles()

  if(!prices) {
    return
  }

  const data = rsi({ data: prices, period: 14 })
  
  const barra = data[data.length - 2]

  if(!orderEntrada && !orderProfit && barra.rsi < long_rsi && data[data.length - 3].rsi >= long_rsi) {
    const leverageResponse = await api.leverage({ leverage })

    if(!leverageResponse) {
      return console.log('ERRO: ao definir leverage')
    }

    const balance = await api.balance({ symbol: 'USDT' })
  
    if(!balance) {
      return console.log('ERRO: ao buscar balanço')
    }

    const price = barra.low
    const quantity = (((balance / divisor) * leverage) / price).toFixed(3)
    
    const responseOrder = await api.newOrderLimit({ side: 'BUY', price, quantity })

    if(!responseOrder) {
      return console.log('ERRO: ao criar ordem limit')
    }

    console.log(`LONG: Order limit definido! ${new Date()}`)
    orderEntrada = responseOrder.orderId
    linhaLimite = addMinutes(barra.open_time, 5 * limite_entrada)
    
    long = true
    short = false
  }else if(!orderEntrada && !orderProfit && barra.rsi > short_rsi && data[data.length - 3].rsi <= short_rsi) {
    const leverageResponse = await api.leverage({ leverage })

    if(!leverageResponse) {
      return console.log('ERRO: ao definir leverage')
    }

    const balance = await api.balance({ symbol: 'USDT' })
  
    if(!balance) {
      return console.log('ERRO: ao buscar balanço')
    }

    const price = Number(barra.high)
    const quantity = (((balance / divisor) * leverage) / price).toFixed(3)

    const responseOrder = await api.newOrderLimit({ side: 'SELL', price, quantity })

    if(!responseOrder) {
      return console.log('ERRO: ao criar ordem limit')
    }

    console.log(`SHORT: Order limit definido! ${new Date()}`)
    orderEntrada = responseOrder.orderId
    linhaLimite = addMinutes(barra.open_time, 5 * limite_entrada)

    long = false
    short = true
  }

  if(long) {
    if(orderEntrada && !orderProfit) {
      const order = await api.getOrder({ orderId: orderEntrada})

      if(!order) {
        return console.log('ERRO: ao buscar ordem limit')
      }
  
      if(order.status === 'FILLED') {
        console.log(`LONG: Order limit executado! ${new Date()}`)
  
        const quantity = Number(order.executedQty).toFixed(3)
        const stopPrice = (Number(order.price) + (Number(order.price) * profit)).toFixed(0)

        const responseOrderTake = await api.newOrderStopTakeMarket({ side: 'SELL', stopPrice, quantity })

        if(!responseOrderTake) {
          return console.log('LONG: Erro ao criar ordem take profit!')
        }
  
        orderProfit = responseOrderTake.orderId
        orderEntrada = 0
        linhaLimite = 0
  
        console.log(`LONG: Take profit definido! ${new Date()}`)
      }else if(linhaLimite <= barra.open_time) {
        const cancel = await api.cancelAllOrders()
    
        if(!cancel) {
          return console.log('SHORT: Erro ao cancelar ordem limit')
        }
        
        orderEntrada = 0
        linhaLimite = 0
  
        short = false
        long = false
  
        console.log(`LONG: Order limit cancelado! ${new Date()}`)
        console.log()
      }
    }

    if(orderProfit && !orderEntrada) {
      const order = await api.getOrder({ orderId: orderProfit })
  
      if(!order) {
        return console.log('LONG: Erro ao buscar ordem take profit')
      }

      if(order.status === 'FILLED') {
        console.log(`LONG: Lucro realizado! ${new Date()}`)
        console.log()
  
        orderProfit = 0
        short = false
        long = false
      }else if(order.status === 'EXPIRED') {
        console.log(`LONG: Perdi a aposta! ${new Date()}`)
        console.log()
  
        orderProfit = 0
        short = false
        long = false
      }else {
        return
      }
    }
  }else if(short) {
    if(orderEntrada && !orderProfit) {
      const order = await api.getOrder({ orderId: orderEntrada })

      if(!order) {
        return console.log('ERRO: ao buscar ordem limit')
      }
  
      if(order.status === 'FILLED') {
        console.log(`SHORT: Order limit executado! ${new Date()}`)
  
        const quantity = Number(order.executedQty).toFixed(3)
        const stopPrice = (Number(order.price) - (Number(order.price) * profit)).toFixed(0)

        const responseOrderTake = await api.newOrderStopTakeMarket({ side: 'BUY', stopPrice, quantity })

        if(!responseOrderTake) {
          return console.log('SHORT: Erro ao criar ordem teke profit!')
        }
  
        orderProfit = responseOrderTake.orderId
        orderEntrada = 0
        linhaLimite = 0
  
        console.log(`SHORT: Take profit definido! ${new Date()}`)
      }else if(linhaLimite <= barra.open_time) {
        const cancel = await api.cancelAllOrders()
    
        if(!cancel) {
          return console.log('SHORT: Erro ao cancelar ordem limit')
        }
        
        orderEntrada = 0
        linhaLimite = 0
  
        short = false
        long = false
  
        console.log(`SHORT: Order limit cancelado! ${new Date()}`)
        console.log()
      }
    }

    if(orderProfit && !orderEntrada) {
      const order = await api.getOrder({ orderId: orderProfit })
  
      if(!order) {
        return console.log('SHORT: Erro ao buscar ordem take profit')
      }

      if(order.status === 'FILLED') {
        console.log(`SHORT: Lucro realizado! ${new Date()}`)
        console.log()
  
        orderProfit = 0
        short = false
        long = false
      }else if(order.status === 'EXPIRED') {
        console.log(`SHORT: Perdi a aposta! ${new Date()}`)
        console.log()
  
        orderProfit = 0
        short = false
        long = false
      }else {
        return
      }
    }
  }
}, env.CRAWLER_INTERVAL);

async function teste() {
  const response = await api.newOrderStopTakeMarket({ side: 'SELL', quantity: '0.004', stopPrice: '1300' })

  console.log(response)
}

//teste()

async function teste2() {
  //const response = await api.getOrder({ orderId: 8389765548478170000 }) FILLED OK
  //const response = await api.getOrder({ orderId: 8389765548478344000 }) CANCELADO NÃO LISTA
  const response = await api.getOrder({ orderId: 8389765548480886000 })

  console.log(response)
}

//teste2()