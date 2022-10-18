const RSI = require('technicalindicators').RSI

function rsi({ data, period }) {
  const close = data.map((c) => c.close)

  const rsiData = RSI.calculate({ values: close, period })

  let dados = []
  for(let i = period * 3; i < rsiData.length; i++) {
    dados.push({
      ...data[i + period],
      rsi: rsiData[i]
    })
  }

  return dados;
}

module.exports = { rsi }