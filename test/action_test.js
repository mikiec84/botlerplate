import test from 'ava'
import Bot from '../src/bot'
import Action from '../src/action'

class Greetings extends Action {
  constructor() {
    super()
    this.intent = 'greetings'
    this.constraints = [
      {
        isMissing: { en: ['How should I call you?'] },
        entities: [{ entity: 'person', alias: 'name' }],
      },
    ]
  }
}

class Delivery extends Action {
  constructor() {
    super()
    this.intent = 'delivery'
    this.constraints = [
      {
        isMissing: { en: ['Wehre do you want to be delivered?'] },
        entities: [{ entity: 'datetime', alias: 'delivery-date' }],
      },
    ]
    this.dependencies = [{
      isMissing: {},
      actions: ['Greetings'],
    }]
  }
}

class Order extends Action {
  constructor() {
    super()
    this.intent = 'order'
    this.dependencies = [{
      isMissing: {},
      actions: ['Greetings'],
    }]
    this.constraints = [{
      isMissing: { en: ['What product would you like?'] },
      entities: [{ entity: 'number', alias: 'product' }],
    }]
  }
}

class Goodbyes extends Action {
  constructor() {
    super()
    this.intent = 'goodbye'
    this.dependencies = [{
      isMissing: { en: ['I need to know what you want before...'] },
      actions: ['Order'],
    }, {
      isMissing: { en: ['Sorry but I need more informations'] },
      actions: ['Delivery'],
    }]
  }
}

const bot = new Bot()
bot.registerActions([Greetings, Order, Delivery, Goodbyes])

test('Action#validate', t => {
  class NoIntent extends Action {
    constructor() {
      super()
      this.constraints = []
    }
  }
  let a = new NoIntent()
  t.is(a.validate(), false)

  class Valid extends Action {
    constructor() {
      super()
      this.intent = 'example'
      this.constraints = [
        { isMissing: { en: ['Some text'], fr: ['Du texte'] },
          entities: [{ entity: 'person', alias: 'name' }] },
      ]
      this.dependencies = [
        { isMissing: { en: ['Some text'], fr: ['Du texte'] },
          actions: ['Greetings'] },
      ]
    }
  }
  a = new Valid()
  t.is(a.validate(), true)

  class InvalidDependencies extends Action {
    constructor() {
      super()
      this.intent = 'example'
      this.constraints = [
        { isMissing: { en: ['Some text'], fr: ['Du texte'] },
          entities: [{ entity: 'person', alias: 'name' }] },
      ]
      this.dependencies = [
        { isMissing: { en: ['Some text'], fr: ['Du texte'] },
          actions: 'Greetings' },
      ]
    }
  }
  a = new InvalidDependencies()
  t.false(a.validate())

  class InvalidConstraints extends Action {
    constructor() {
      super()
      this.intent = 'example'
      this.constraints = [
        { isMissing: { en: ['Some text'], fr: ['Du texte'] },
          entities: [{ alias: 'name' }] },
      ]
      this.dependencies = [
        { isMissing: { en: ['Some text'], fr: ['Du texte'] },
          actions: ['Greetings'] },
      ]
    }
  }
  a = new InvalidConstraints()
  t.false(a.validate())

  class RequiresItself extends Action {
    constructor() {
      super()
      this.dependencies = [{ actions: 'RequiresItself' }]
    }
  }
  a = new RequiresItself()
  t.false(a.validate())
})

test('Action#constraintsAreComplete', t => {
  const { Greetings: greet, Order: order } = bot.actions
  const conversation = {
    userData: {},
    conversationData: { states: {} },
    memory: {},
  }
  t.false(greet.constraintsAreComplete(conversation.memory))
  t.false(order.constraintsAreComplete(conversation.memory))

  conversation.memory.name = { raw: 'Jean Valjean', value: 'Jean Valjean' }
  t.true(greet.constraintsAreComplete(conversation.memory))
  t.false(order.constraintsAreComplete(conversation.memory))

  conversation.memory.product = { raw: 'one', value: 1 }
  t.true(greet.constraintsAreComplete(conversation.memory))
  t.true(order.constraintsAreComplete(conversation.memory))
})

test('Action#dependenciesAreComplete', t => {
  const {
    Greetings: greet,
    Order: order,
    Delivery: delivery,
    Goodbyes: goodbyes } = bot.actions
  const conversation = {
    userData: {},
    conversationData: { states: {} },
    memory: {},
  }
  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.false(order.dependenciesAreComplete(bot.actions, conversation))
  t.false(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.false(goodbyes.dependenciesAreComplete(bot.actions, conversation))

  bot.markActionAsDone('Greetings', conversation)

  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.true(order.dependenciesAreComplete(bot.actions, conversation))
  t.true(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.false(goodbyes.dependenciesAreComplete(bot.actions, conversation))

  bot.markActionAsDone('Order', conversation)

  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.true(order.dependenciesAreComplete(bot.actions, conversation))
  t.true(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.false(goodbyes.dependenciesAreComplete(bot.actions, conversation))

  bot.markActionAsDone('Delivery', conversation)

  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.true(order.dependenciesAreComplete(bot.actions, conversation))
  t.true(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.true(goodbyes.dependenciesAreComplete(bot.actions, conversation))
})

test('Action#isComplete', t => {
  const {
    Greetings: greet,
    Order: order,
    Delivery: delivery,
    Goodbyes: goodbyes,
  } = bot.actions
  const conversation = {
    userData: {},
    conversationData: { states: {} },
    memory: {},
  }
  t.false(greet.isComplete(bot.actions, conversation))
  t.false(order.isComplete(bot.actions, conversation))
  t.false(delivery.isComplete(bot.actions, conversation))
  t.false(goodbyes.isComplete(bot.actions, conversation))

  conversation.memory.name = { raw: 'Jean Valjean', value: 'Jean Valjean' }
  t.true(greet.isComplete(bot.actions, conversation))
  t.false(order.isComplete(bot.actions, conversation))
  t.false(delivery.isComplete(bot.actions, conversation))
  t.false(goodbyes.isComplete(bot.actions, conversation))

  bot.markActionAsDone('Greetings', conversation)
  t.true(greet.isComplete(bot.actions, conversation))
  t.false(order.isComplete(bot.actions, conversation))
  t.false(delivery.isComplete(bot.actions, conversation))
  t.false(goodbyes.isComplete(bot.actions, conversation))

  // complete delivery constraint
  conversation.memory['delivery-date'] = {
    raw: 'tomorrow at 9pm',
    formatted: 'Saturday, 01 October 2016 at 09:00:00 PM',
    accuracy: 'day,hour',
    chronology: 'future',
    time: '2016-10-01T21:00:00',
    confidence: 0.99,
  }
  t.true(greet.isComplete(bot.actions, conversation))
  t.false(order.isComplete(bot.actions, conversation))
  t.true(delivery.isComplete(bot.actions, conversation))
  t.false(goodbyes.isComplete(bot.actions, conversation))

  conversation.memory.product = { raw: 'one', value: 1 }
  t.true(greet.isComplete(bot.actions, conversation))
  t.true(order.isComplete(bot.actions, conversation))
  t.true(delivery.isComplete(bot.actions, conversation))
  t.false(goodbyes.isComplete(bot.actions, conversation))

  bot.markActionAsDone(order, conversation)
  t.true(greet.isComplete(bot.actions, conversation))
  t.true(order.isComplete(bot.actions, conversation))
  t.true(delivery.isComplete(bot.actions, conversation))
  t.false(goodbyes.isComplete(bot.actions, conversation))

  bot.markActionAsDone(delivery, conversation)
  t.true(greet.isComplete(bot.actions, conversation))
  t.true(order.isComplete(bot.actions, conversation))
  t.true(delivery.isComplete(bot.actions, conversation))
  t.true(goodbyes.isComplete(bot.actions, conversation))
})

test('Action#isDone', t => {
  const {
    Greetings: greet,
    Goodbyes: goodbyes } = bot.actions
  const conversation = {
    userData: {},
    conversationData: { states: {} },
    memory: {},
  }
  t.false(greet.isDone(conversation))
  t.false(goodbyes.isDone(conversation))

  // with strings
  bot.markActionAsDone('Greetings', conversation)
  t.true(greet.isDone(conversation))

  // with instance
  bot.markActionAsDone(goodbyes, conversation)
  t.true(goodbyes.isDone(conversation))
})

test('Action#isActionable', t => {
  const {
    Greetings: greet,
    Order: order,
    Delivery: delivery,
    Goodbyes: goodbyes } = bot.actions
  const conversation = {
    userData: {},
    conversationData: { states: {} },
    memory: {},
  }
  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.false(order.dependenciesAreComplete(bot.actions, conversation))
  t.false(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.false(goodbyes.dependenciesAreComplete(bot.actions, conversation))

  bot.markActionAsDone('Greetings', conversation)

  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.true(order.dependenciesAreComplete(bot.actions, conversation))
  t.true(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.false(goodbyes.dependenciesAreComplete(bot.actions, conversation))

  bot.markActionAsDone('Order', conversation)

  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.true(order.dependenciesAreComplete(bot.actions, conversation))
  t.true(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.false(goodbyes.dependenciesAreComplete(bot.actions, conversation))

  bot.markActionAsDone('Delivery', conversation)

  t.true(greet.dependenciesAreComplete(bot.actions, conversation))
  t.true(order.dependenciesAreComplete(bot.actions, conversation))
  t.true(delivery.dependenciesAreComplete(bot.actions, conversation))
  t.true(goodbyes.dependenciesAreComplete(bot.actions, conversation))
})
