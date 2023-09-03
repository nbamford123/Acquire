* write hotel price tests
* add pre-commit hook
* make starting user game owner?
* newGame()
* addPlayer(game, player)
* startGame(game)-- everyone gets game state with "started" object (draw + play position)
* cancelGame(game)
* push or pull? Pull makes more sense, I guess a poll as long as you're playing the game-- note this will cause aws usage if we're not careful, but we can always cache the game state... how will the client know the game state has changed? Does it matter?