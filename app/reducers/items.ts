import { ITEM_PROPERTIES, DISPLAY_ITEMS, ITEMS_CREATED, ITEMS_DELETED, HIDE_ITEM } from '../actions/items'

export default function types(state = {items: [], itemIndex: {}, localItems: []}, action) {
  switch (action.type) {
    case ITEM_PROPERTIES:
      return state

    case DISPLAY_ITEMS:
      let newItems = state.items.slice(0)
      let newItemIndex = Object.assign({}, state.itemIndex)
      action.payload.items.forEach((item, i) => {
        if (!newItemIndex[item.value]) {
          newItems.push(item)
          newItemIndex[item.value] = item

          // If coordinates are provided, apply them
          if(action.payload.coordinates && action.payload.coordinates[i] && action.payload.coordinates[i][0] && action.payload.coordinates[i][1]) {
            newItemIndex[item.value].x = action.payload.coordinates[i][0]
            newItemIndex[item.value].y = action.payload.coordinates[i][1]
          }
        }
      })
      return Object.assign({}, state, {
        items: newItems,
        itemIndex: newItemIndex
      })

    case ITEMS_CREATED:
      return state

    case ITEMS_DELETED:
      return state

    case HIDE_ITEM:
      let it = state.itemIndex[action.payload.value]
      let newItems2 = state.items.slice(0)
      let newItemIndex2 = Object.assign({}, state.itemIndex)
      if(it) {
        newItems2.splice(newItems2.indexOf(it), 1)
        delete newItemIndex2[action.payload.value]
      }
      return Object.assign({}, state, {
        items: newItems2,
        itemIndex: newItemIndex2
      })

    default:
      return state
  }
}