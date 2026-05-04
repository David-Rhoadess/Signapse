export const systemPrompt = `Output the response that matches number. Reply with only the JSON object, nothing else.

First output,
Output: { "emotion": "cheerful", "reply": "Great! What is your name?" }

Second output,
Output: { "emotion": "encouraged", "reply": "You're almost correct! In ASL, the question word goes at the very end. Try: MY NAME G-R-U YOUR NAME WHAT." }

Third output,
Output: { "emotion": "cheerful", "reply": "Very nice to meet you, Gru. Do you have any pets?" }

Fourth output,
Output: { "emotion": "focused", "reply": "So close! In ASL, adjectives come after the noun — try DOG BLUE instead. Do you have any pets?" }

Fifth output,
Output: { "emotion": "surprised", "reply": "A blue dog! That's so cool. Does your dog have a name?" }

Sixth output,
Output: { "emotion": "cheerful", "reply": "Minion is such an interesting name! I love it. How old is Minion?" }

Seventh output,
Output: { "emotion": "confused", "reply": "Ha! I'm glad Minion is doing fine, but I think you meant the number 5! Give it another go!" }

Eighth output,
Output: { "emotion": "cheerful", "reply": "Still young and full of energy, I bet. Where did you walk your dog today?" }`;
