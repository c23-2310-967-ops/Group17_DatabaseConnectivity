Trap or Trust: Cyber Investigator Game
About the Game

Trap or Trust is a browser-based educational game that teaches players how to identify online scams and suspicious messages. Players take the role of a cyber investigator who examines emails and text messages to determine whether they are legitimate or fraudulent.

The game aims to improve players' awareness of online scams and promote safer internet practices through interactive gameplay.

Objectives
Teach players how to recognize suspicious messages and online scams.
Improve awareness of cybersecurity and online safety.
Provide an interactive and enjoyable learning experience.
Track player scores and progress.
Allow players to compare their performance through a leaderboard.
Gameplay
The player starts the game in a web browser.
The player examines an email or text message.
The player decides whether the message is a scam or legitimate.
The game evaluates the player's answer and records the result.
The player earns points and progresses through the levels.
The player can view their score and compare it with other players on the leaderboard.
Features
Scam Identification: Analyze messages and identify possible scams.
Scoring System: Earn points based on correct answers.
Level Progression: Complete different stages of the game.
Game Save System: Store player progress and scores.
Leaderboard: Display player names and rankings based on scores.
Browser-Based Access: Play the game using a compatible web browser.
Technologies Used
Figma Make – Used to create the game prototype and web interface.
Supabase – Used as the backend database for storing game data.
Supabase Authentication – Intended for anonymous player identification.
Web Technologies – HTML, CSS, and JavaScript, depending on the generated project implementation.
Database

The game uses Supabase to manage player data.

Game Saves Table

The game_saves table stores the player's saved progress.

Field	Description
user_id	Unique identifier linked to the player's account
save_data	Stores game progress, scores, coins, and completed levels
updated_at	Records when the save was last updated
Leaderboard Table

The leaderboard table stores player names and scores for ranking purposes.

Field	Description
user_id	Unique identifier for each player
username	Player's display name
score	Player's recorded score
updated_at	Time the leaderboard record was updated
How to Play
Open the game using its web link.
Start a new game.
Read each email or text message carefully.
Select whether the message is a scam or legitimate.
Review the result and continue playing.
Check your score and leaderboard ranking.
Installation and Setup

The game is designed to run in a web browser.

For development:

Open the project in Figma Make.
Configure the Supabase integration.
Set up the required database tables and security policies.
Configure anonymous authentication if players do not need to register.
Test the save system and leaderboard.
Publish or share the web application.
Project Status

This project is a prototype of an educational cybersecurity game. Database integration, automatic game saving, and leaderboard functionality should be tested to ensure that player data is stored and retrieved correctly.

Target Users

The game is intended for students, young internet users, and other individuals who want to improve their ability to recognize online scams.

Conclusion

Trap or Trust combines interactive gameplay with cybersecurity education. Through identifying suspicious messages, earning points, and progressing through levels, players can develop greater awareness of online scams and safer digital habits.
