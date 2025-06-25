# TO DO

## Next Steps

1. Finish the server calls (delete game, etc.)
3. Add ~authorization~, KV store, deploy, retest
4. Client

## Misc

- end game
- ttl/culling of old games

## Actions

Need a new action state apart from the game state, it can be like

```typescript
interface gameAction {
  turn: number;
  actions: string[];
}
```

then the server can send game actions along with the state update, it will be everything that's happened since your last turn, which mean we will have
to filter and cull the actions
