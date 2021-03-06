require('./helpers/setup').bootstrap()

import Session from './helpers/session'
import { createIntervalSlot, createCitySlot, createConditionSlot } from './utils'

it('should get the weather in NYC for today and tomorrow', async () => {
    const today = new Date(Date.now())
    today.setHours(0,0,0,0)
    const dayAfterTomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 2)

    const session = new Session()
    await session.start({
        intentName: 'snips-assistant:WeatherForecast',
        input: 'What will the weather be until the day after tomorrow',
        slots: [
            createIntervalSlot({
                from: today.toISOString(),
                to: dayAfterTomorrow.toISOString(),
                rawValue: 'until the day after tomorrow'
            }),
            createCitySlot('New York City')
        ]
    })
    const endSessionMessage = await session.end()
    const dayParts = endSessionMessage.text.match(/({.*})/g)
    expect(dayParts.length).toBe(3)
    dayParts.map(_ => JSON.parse(_)).forEach(({ key, options }, index) => {
        expect(key).toBe('forecast.weather.day')
        switch(index) {
            case 0:
                expect(options.place).toBe('New York City')
                expect(options.time).toMatch(/days\.today/)
                expect(options.time).toMatch(/partOfDay\.morning/)
                expect(options.predictions).toMatch(/weatherTypes\.quantifier\.clouds/)
                expect(options.temperatures).toMatch(/"temperature":275/)
                break
            case 1:
                expect(options.place).toBe(null)
                expect(options.time).toMatch(/partOfDay\.afternoon/)
                expect(options.time).toMatch(/partOfDay\.evening/)
                expect(options.predictions).toMatch(/weatherTypes\.quantifier\.sun/)
                expect(options.temperatures).toMatch(/"minTemp":277,"maxTemp":281/)
                break
            case 2:
                expect(options.place).toBe(null)
                expect(options.time).toMatch(/days\.tomorrow/)
                expect(options.predictions).toMatch(/quantifier\.mostly/)
                expect(options.predictions).toMatch(/weatherTypes\.quantifier\.clouds/)
                expect(options.temperatures).toMatch(/"minTemp":272,"maxTemp":277/)
                break
        }
    })
})

it('should get the temperature in NYC for today and tomorrow', async () => {
    const today = new Date(Date.now())
    today.setHours(0,0,0,0)
    const dayAfterTomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 2)

    const session = new Session()
    await session.start({
        intentName: 'snips-assistant:TemperatureForecast',
        input: 'What will the temperature be until the day after tomorrow',
        slots: [
            createIntervalSlot({
                from: today.toISOString(),
                to: dayAfterTomorrow.toISOString(),
                rawValue: 'until the day after tomorrow'
            }),
            createCitySlot('New York City')
        ]
    })
    const endSessionMessage = await session.end()
    const dayParts = endSessionMessage.text.match(/({.*})/g)
    expect(dayParts.length).toBe(4)
    dayParts.map(_ => JSON.parse(_)).forEach(({ key, options }, index) => {
        expect(key).toBe('forecast.temperatures.day')
        switch(index) {
            case 0:
                expect(options.place).toBe('New York City')
                expect(options.time).toMatch(/days\.today/)
                expect(options.time).toMatch(/partOfDay\.morning/)
                expect(options.temperatures).toMatch(/"temperature":275/)
                break
            case 1:
                expect(options.place).toBe(null)
                expect(options.time).toMatch(/partOfDay\.afternoon/)
                expect(options.temperatures).toMatch(/"minTemp":279,"maxTemp":281/)
                break
            case 2:
                expect(options.place).toBe(null)
                expect(options.time).toMatch(/partOfDay\.evening/)
                expect(options.temperatures).toMatch(/"minTemp":277,"maxTemp":281/)
                break
            case 3:
                expect(options.place).toBe(null)
                expect(options.time).toMatch(/days\.tomorrow/)
                expect(options.temperatures).toMatch(/"minTemp":272,"maxTemp":277/)
                break
        }
    })
})

it('should not detect rain today or tomorrow', async () => {
    const today = new Date(Date.now())
    today.setHours(0,0,0,0)
    const dayAfterTomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 2)

    const session = new Session()
    await session.start({
        intentName: 'snips-assistant:WeatherConditionRequest',
        input: 'Will it rain in the next two days in NYC',
        slots: [
            createIntervalSlot({
                from: today.toISOString(),
                to: dayAfterTomorrow.toISOString(),
                rawValue: 'in the next two days'
            }),
            createCitySlot('New York City'),
            createConditionSlot('rain')
        ]
    })
    const endSessionMessage = await session.end()
    const sentences = endSessionMessage.text.match(/({.*})/g)
    expect(sentences.length).toBe(4)

    const [ affirmation ] = sentences.map(_ => JSON.parse(_))

    expect(affirmation.key).toBe('forecast.conditional.no.rain')
    expect(affirmation.options.place).toBe('New York City')
})

it('should detect rain for the next 5 days', async () => {
    const today = new Date(Date.now())
    today.setHours(0,0,0,0)
    const fifthDay = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 5)

    const session = new Session()
    await session.start({
        intentName: 'snips-assistant:WeatherConditionRequest',
        input: 'Will it rain in the next five days in NYC',
        slots: [
            createIntervalSlot({
                from: today.toISOString(),
                to: fifthDay.toISOString(),
                rawValue: 'in the next five days'
            }),
            createCitySlot('New York City'),
            createConditionSlot('rain')
        ]
    })
    const endSessionMessage = await session.end()
    const sentences = endSessionMessage.text.match(/({.*})/g)
    expect(sentences.length).toBe(2)

    const [ affirmation, forecast ] = sentences.map(_ => JSON.parse(_))

    expect(affirmation.key).toBe('forecast.conditional.yes.rain')
    expect(affirmation.options.place).toBe('New York City')

    expect(forecast.key).toBe('forecast.weather.day')
    expect(forecast.options.time).toMatch(/days\./)
    expect(forecast.options.predictions).toMatch(/qualifier\.light/)
    expect(forecast.options.predictions).toMatch(/weatherTypes\.qualifier\.rain/)
    expect(forecast.options.predictions).toMatch(/weatherTypes\.qualifier\.rain/)
    expect(forecast.options.temperatures).toMatch(/"minTemp":275,"maxTemp":283/)
})
