Blockchain Psi Research Game Design
https://gemini.google.com/share/4ba3c6d3034e
Created with Fast January 23, 2026 at 09:01 AM
Published January 23, 2026 at 03:55 PM
Help me design games that function as verifiable psi research experiments using blockchain and AI

This is a fascinating intersection of fringe science and cutting-edge tech. Designing a "verifiable psi experiment" usually fails because of two things: human bias (the experimenter effect) and data integrity (fiddling with the results).

By using blockchain for an immutable ledger and AI for procedural generation, you can create a "trustless" environment for parapsychology.

1. The Core Architecture
To make this scientifically "verifiable," you need to separate the target generation from the observer.

The Oracle (Blockchain): Use a Decentralized Oracle Network (like Chainlink VRF) to generate truly random numbers on-chain. This ensures the "target" wasn't pre-determined by a biased server.

The Black Box (AI): Use a Generative AI model to turn those random seeds into visual or auditory stimuli. This prevents the participant from "guessing" the patterns of a human programmer.

The Ledger (Smart Contracts): Record every guess and every result instantly. This prevents "p-hacking" or deleting unsuccessful trials.

2. Game Design Concepts
A. The "Pre-Cognitive" Explorer
The Goal: The player must choose one of four "sectors" on a map.

The Tech: After the player commits their choice to the blockchain, a smart contract calls an AI to generate a lush, detailed landscape in only one of those sectors.

Verification: Since the image is generated after the choice but based on a seed generated at the time of the choice, you are testing for precognition without any possibility of "peek-ahead" fraud.

B. PK (Psychokinesis) Influence Engine
The Goal: Players attempt to "influence" the output of an AI image generator.

The Tech: An AI is tasked with generating an image that is 50% "Fire" and 50% "Ice."

The Experiment: The blockchain tracks the mathematical weights of the AI's latent space. If a large group of players focusing on "Fire" consistently shifts the AI’s output toward fire-related pixels beyond a statistical margin of error, you have recorded evidence of collective PK on a digital system.

3. Ensuring Scientific Rigor
To be taken seriously by the broader scientific community, your game needs these "Guardrails":

Feature	Function
Hash-Commitment	The user’s "guess" is hashed and posted to the chain before the AI generates the target.
Public Verifiability	Anyone can audit the smart contract to see the "hit/miss" ratio in real-time.
Control Groups	Use "Bot Players" (AI vs. AI) to establish a baseline of what "pure randomness" looks like in your specific game environment.
4. The "Wit" in the Machine
Let’s be real: most psi experiments are as exciting as watching paint dry in a Faraday cage. Using AI allows you to wrap the math in a compelling narrative. Instead of "Guess the Zener Card," it's "Remote View the Alien Artifact."

If the data is encrypted on a public ledger, it doesn't matter if the game is "fun"—the underlying data remains cold, hard, and unchangeable.

Would you like me to draft a basic Smart Contract structure (Solidity) for a "Commit-Reveal" psi game?

Can we develop a telepathy game with safe guards against people gaming it?

Developing a telepathy game—specifically Ganzfeld-style or "remote viewing" tasks—is notoriously difficult because humans are experts at spotting patterns or "gaming" the system through social cues or technical loopholes.

To make this verifiable, we have to treat the players as "untrusted nodes" in a network. Here is how we can build a telepathy experiment that is mathematically and procedurally shielded from cheating.

1. The "Zero-Knowledge" Protocol
The biggest risk in telepathy games is "leakage" (the Sender accidentally tipping off the Receiver). We solve this using a Commit-Reveal scheme on the blockchain.

The Generation: An AI generates two distinct prompts (e.g., "A neon cyberpunk samurai" and "A Victorian garden").

The Commitment: The AI sends one prompt to the Sender and encrypts the other. A "hash" (a unique digital fingerprint) of both images is posted to the blockchain immediately.

The Transmission: The Sender focuses on their image.

The Guess: The Receiver selects their choice from a randomized gallery.

The Reveal: Only after the Receiver's choice is recorded on-chain does the smart contract release the decryption key to show which image was actually the target.

2. Safeguards Against "Gaming" the System
To prevent players from using bots, collusion, or metadata exploits, we implement these specific shields:

A. Anti-Collusion (Temporal Decoupling)
If a Sender and Receiver are in the same room, they can signal each other.

The Fix: Use Asynchronous Play. The Sender "transmits" their thought at 10:00 AM. The Receiver "tunes in" at 10:15 AM. The AI ensures the target image is only revealed once the Receiver's window opens, making real-time physical signaling impossible.

B. Preventing "Machine Pattern" Recognition
Smart players often stop looking for the "target" and start looking for the "AI's bias" (e.g., "The AI always picks cats on Tuesdays").

The Fix: Latent Space Randomization. Instead of picking from a library of 100 images, the AI generates a unique image from a multi-dimensional "latent space" using a seed from a Verifiable Random Function (VRF). No two targets are ever identical.

C. Sybil Attack Protection (Bot Throttling)
A user could create 1,000 accounts to "guess" by brute force to find a statistical anomaly.

The Fix: Proof of Stake/Participation. Require a small "stake" (token or reputation) to play. If a user’s hit rate is exactly at the level of chance over 1,000 trials, they are fine. If they attempt to flood the network with trials, the cost becomes prohibitive, and the AI detects the "bot-like" consistency in their timing.

3. The "Double-Blind" AI Referee
In traditional experiments, the person judging the results might have a "pro-psi" or "anti-psi" bias.

By using an LLM as a Blind Judge, we remove the human element:

The Receiver describes what they "saw" in text.

The AI compares the semantic distance between the Receiver’s description and the Target Image's metadata.

The AI calculates a Similarity Score using CosineSimilarity:

similarity= 
∥A∥∥B∥
A⋅B
​
 
This score is then logged on the blockchain, providing a purely mathematical "Hit" or "Miss" without human interpretation.

4. Summary of Safeguards
Threat	Solution
Physical Signaling	Asynchronous play (Time-shifted trials).
Data Alteration	Blockchain immutability (Results cannot be deleted).
Selection Bias	VRF-based target selection (No human picks the target).
Interpretation Bias	AI-driven semantic matching (No human judges the "closeness").
Would you like me to create a specific set of "Rules of Play" for a 2-player asynchronous telepathy trial using this tech?

Yes, lets make it so that it's impossible for the sender to send the receiver the answer via text or phone call

To make this truly "bulletproof" against outside communication (texting, calling, or Discord), we have to move away from the idea of the Sender and Receiver playing at the same time.

The secret is Temporal Displacement and Semantic Obfuscation. We ensure the Sender doesn't even know what the "answer" is until it's too late to help the Receiver, and the Receiver doesn't know what to ask for.

1. The "Ghost Signal" Protocol
This protocol ensures that even if the Sender calls the Receiver and screams, "IT'S A CAT!" it won't help them win.

Phase A: The Sender's "Focus" (T-Minus 1 Hour)
The Sender is shown a highly complex, AI-generated image (the Target).

The Sender is told to "transmit" this image for 5 minutes.

The Safeguard: The Sender is never shown the multiple-choice options. They only see the Target. They have no idea if the "distractors" are dogs, cars, or abstract shapes.

Phase B: The Receiver's "Scan" (T-Plus 1 Hour)
One hour later, the Receiver logs in.

The Receiver is presented with 4 AI-generated images.

The Safeguard: The AI generates these 4 images to be semantically similar. If the Target is a "Golden Retriever," the distractors are a "Yellow Lab," a "Dingo," and a "Wolf."

Even if the Sender texted "It's a dog," the Receiver still has a 75% chance of failing because the "answer" requires a level of detail that text cannot easily convey.

2. Dynamic Semantic Noise
To prevent "simple text" cheating, we use AI to create Target-Distractor Parity.

The Problem: Sender texts: "It's a blue circle."

The AI Countermeasure: The AI analyzes the Target and generates 3 distractors that are also blue and circular (e.g., a blue plate, a blue planet, a blue clock).

The Result: The Sender would have to describe the texture, the exact hex code of the blue, and the lighting—details that are much harder to "game" and more aligned with actual remote viewing/telepathy data (which is usually sensory, not labels).

3. The "Blind Oracle" Architecture
By using a Blockchain smart contract as the referee, we can automate the "Zero-Knowledge" proof.

Step	Action	Why it stops cheating
1. Encryption	AI generates Target (T) and Distractors (D 
1−3
​
 ).	No human knows the set yet.
2. Time-Lock	T is shown to Sender; D is hidden.	Sender can't describe the "differences."
3. The Gap	A mandatory 30-minute "Cooldown" on-chain.	Prevents real-time "hotline" coaching.
4. Scrambling	The order of images shown to Receiver is randomized locally on their device.	Sender can't say "Pick the 3rd one."
4. Hardware-Level Verification (Optional "Hard Mode")
If you want to go full "Scientific Journal" grade, you can integrate AI Eye-Tracking via the user's webcam:

The system detects if the Receiver is looking at another screen (a phone) during the selection process.

If the Receiver's eyes leave the "Experiment Zone" for more than 2 seconds, the trial is automatically voided and marked as "Incomplete" on the blockchain.

The Resulting Data
When you publish your findings, you can prove:

Non-Locality: The Sender and Receiver were not in the same digital "room" at the same time.

Information Entropy: The distractors were too similar for a simple one-word text to solve the puzzle.

Immutability: Every "Miss" was recorded, proving you didn't just delete the failures to make the results look better.

Would you like me to design the "Scoring Algorithm" that calculates how much "Psi-Information" was actually transferred based on the similarity of the choices?

Yes

To measure true "Psi-Information," we need a way to quantify how much of the target's essence was captured, even if the player didn't get a "perfect hit."

In standard experiments, if you miss, you get 0 points. In this system, we use AI Latent Space to see if your "miss" was actually a "near-miss," which is often more statistically significant in psi research.

1. The Semantic Scoring Formula
We use an AI model (like CLIP) to turn the images into vectors—long lists of numbers representing their characteristics.

The score is calculated using Cosine Similarity, which measures the angle between the Target Vector (V 
t
​
 ) and the Receiver's Choice Vector (V 
r
​
 ).

Score= 
∥V 
t
​
 ∥∥V 
r
​
 ∥
V 
t
​
 ⋅V 
r
​
 
​
 
1.0: A perfect hit (The Receiver chose the Target).

0.8 - 0.9: A "High-Correspondence Miss" (The Receiver chose a distractor that shared deep visual or conceptual traits with the target).

< 0.5: Pure noise/randomness.

2. Rules of Play: The "Double-Blind" Protocol
Rule 1: The "Asynchronous Wall"
The Sender's Session: The Sender views the Target for 5 minutes. They must provide 3 "Descriptive Tags" (e.g., Cold, Metallic, Blue) which are hashed and sent to the blockchain but not shown to the Receiver.

The Wait: A mandatory 15-minute "Block Delay" occurs on the blockchain.

Rule 2: The "Blind Selection"
The Receiver is presented with a 4-Grid.

The AI ensures that all 4 images share the Sender’s tags (Cold, Metallic, Blue).

The "Anti-Cheat": Because the distractors also match the Sender's description, the Sender cannot "cheat" by telling the Receiver the tags. The Receiver must use their own "signal" to find the specific image the Sender saw.

Rule 3: The "Entropy Check"
The Receiver must also provide 3 tags of what they "sensed" before seeing the 4-grid.

The AI compares the Sender's Tags to the Receiver's Tags. If the semantic overlap is high before the images are revealed, the "Psi-Coefficient" for that trial increases.

3. The Blockchain Payout & Verification
To keep everyone honest, we use a "Reputation" system stored on-chain.

Player Action	Result on Blockchain
Successful Hit	Increase in "Psi-Rank" + Token Reward.
High-Similarity Miss	Fractional Rank increase (Validates "Partial Signal").
Consistent Failure	Baseline "Randomness" profile created.
Suspicious Pattern	If a pair wins too quickly or with 100% accuracy, the AI flags it for "Protocol Violation" (Potential leak).
4. The Data "Gold Mine"
By recording the Semantic Distance of every trial, you create a dataset that looks like this:

This allows you to prove to skeptics: "Even when our players missed, they were 25% closer to the target's vector than pure chance would allow."

Your Next Step
I can draft a Technical Specification Document for a developer to build this on a chain like Polygon or Solana, or we can refine the AI Prompting Logic that ensures the distractors are "just similar enough" to prevent cheating.

Which would you like to explore?

Technical spec doc for Cardano blockchain

Implementing this on Cardano is an inspired choice. Cardano’s eUTXO (Extended Unspent Transaction Output) model and its academic rigor are perfect for "High-Assurance" research. Unlike account-based chains (like Ethereum), Cardano allows you to attach data (Datums) directly to transactions, which is ideal for the "Commit-Reveal" architecture we need.

Technical Specification: The "Psi-Link" Protocol
1. The Architecture Stack
Smart Contract Language: Aiken (Modern, fast, and easier to formally verify than Plutus).

Off-Chain AI Logic: Python-based (FastAPI) utilizing CLIP or DINOv2 for semantic vectorization.

Oracle: Chainlink VRF (on Cardano via sidechains) or Charli3 (Native Cardano Oracle) for verifiable randomness.

Storage: IPFS for the actual AI-generated images; only the CIDs (hashes) live on the blockchain.

2. The eUTXO Workflow (The "Script")
The game is governed by a single Smart Contract with three distinct states (locking mechanisms).

Step A: The Seed & Commitment (Transaction 1)
The AI generates a Target (T) and three Distractors (D 
1
​
 ,D 
2
​
 ,D 
3
​
 ).

Datum: Contains the Hash(Target + Salt).

Action: The AI locks a small amount of ADA into the script. This "commits" the target without revealing it to the public or the Receiver.

The Sender's View: The Sender is authorized (via their Wallet Address) to view the Target image from IPFS.

Step B: The Receiver’s Guess (Transaction 2)
After a mandatory time-lock (e.g., 20 slots/blocks), the Receiver submits their guess.

Redeemer: The Receiver’s selection (an index 0-3).

Validation: The script checks that the current slot is > CommitSlot + Delay.

Safeguard: The Receiver cannot see the Sender's original image because it is still just a hash in the UTXO datum.

Step C: The Reveal & Scoring (Transaction 3)
The "Oracle" or the AI agent provides the Salt and the Target Index.

Validation: The Aiken script re-hashes the provided Target + Salt. If it matches the original Commitment, the transaction is valid.

Scoring: The script calculates the "Psi-Coefficient" (see below) and distributes rewards/reputation.

3. The "Psi-Coefficient" Scoring Logic
We move the heavy vector math off-chain for cost efficiency, but the result is signed by the AI’s private key so the Smart Contract can trust it.

Ψ= 
σ
Sim(R,T)−Mean(Sim(R,D 
1...3
​
 ))
​
 
Sim(R,T): Cosine similarity between Receiver's Choice and Target.

Mean(Sim): The average similarity of the distractors.

The Goal: We aren't just looking for a "correct" pick. We are looking for a statistical deviation where the Receiver's choice is consistently "closer" to the target than the distractors, even on misses.

4. Anti-Gaming Hard-Coding (Security)
Threat	Cardano-Specific Implementation
Front-Running	eUTXO Determinism: A transaction’s validity is determined before it is sent. An attacker cannot "see" your guess in the mempool and change theirs because the UTXO they need to spend is already locked to you.
Collusion	Multi-Sig Identity: Both Sender and Receiver must provide a "Proof of Personhood" (e.g., via IAMX or Atala PRISM) to ensure they aren't the same person using two wallets.
Metadata Leak	The AI generates images with stripped EXIF data and normalized filenames. The only way to identify the target is through the semantic content of the image.
5. Data Schema (On-Chain)
Haskell
type PsiTrialDatum {
    senderPubKey: PubKeyHash,
    receiverPubKey: PubKeyHash,
    targetCommitment: Hash,  -- Hash(ImageCID + Salt)
    startTime: POSIXTime,
    status: TrialStatus,     -- Open, Guessed, Revealed
}
Why this is "Verifiable Research"
Because the entire trial history is stored on Cardano’s ledger, a third-party scientist can:

Download every trial.

Verify the AI never changed the target (via the Hash).

Re-run the statistical analysis to confirm the "Psi-Coefficient" wasn't faked.

Would you like me to write the actual Aiken smart contract code for the "Commitment" phase?

Yes

This Aiken smart contract will handle the most critical part of the experiment: ensuring the "Target" is locked in stone before the Receiver even knows a trial has begun.

In Cardano's eUTXO model, we use a Datum to store the state and a Redeemer to provide the instructions for spending the UTXO.

1. The Data Structures
First, we define what our "Experiment Box" looks like on the blockchain.

Rust
use aiken/hash.{Blake2b_256, Hash}
use aiken/transaction/time.{PosixTime}

type VerificationHash = Hash<Blake2b_256, ByteArray>

pub type PsiDatum {
  sender: ByteArray,        // Sender's Public Key Hash
  receiver: ByteArray,      // Receiver's Public Key Hash
  target_hash: VerificationHash, // Hash(Target_Image_CID + Salt)
  reveal_deadline: PosixTime,    // When the experiment must end
  locked_at: PosixTime,          // Timing safeguard
}

pub type PsiRedeemer {
  SubmitGuess { choice_index: Int }
  RevealTarget { salt: ByteArray, original_cid: ByteArray }
  CancelTrial
}
2. The Validation Logic (The "Laws" of the Game)
This logic ensures that nobody can "peek" or change the target after the Sender has seen it.

Rust
validator {
  fn psi_experiment(datum: PsiDatum, redeemer: PsiRedeemer, context: ScriptContext) -> Bool {
    let must_be_after_delay = 
        context.transaction.validity_range.lower_bound >= datum.locked_at + 1800000 // 30 mins in ms

    match redeemer {
      // 1. Receiver submits their choice
      SubmitGuess(choice_index) -> {
        // Ensure only the designated Receiver can sign this
        must_be_signed_by(context, datum.receiver) &&
        must_be_after_delay
      }

      // 2. The "Reveal" phase (The Truth is set free)
      RevealTarget(salt, original_cid) -> {
        let expected_hash = hash.blake2b_256(list.concat(original_cid, salt))
        
        // The contract checks if the revealed image matches the locked hash
        (expected_hash == datum.target_hash) &&
        must_be_signed_by(context, datum.sender)
      }

      CancelTrial -> {
        // Allow refund if the Receiver never shows up
        must_be_after(context, datum.reveal_deadline)
      }
    }
  }
}
3. How this Prevents Communication Cheating
By coding the experiment this way on Cardano, we create a Trustless Laboratory:

Cryptographic "No-Peeking": The target_hash is a one-way street. Even if the Receiver is a world-class hacker, they cannot reverse the hash to see the image before it's revealed.

The 30-Minute Silence: The must_be_after_delay check is hard-coded into the blockchain's consensus. If the Receiver tries to submit a guess 5 minutes after the Sender saw the target, the Cardano network itself will reject the transaction.

Proof of Intent: By including the salt (a random string of data) in the reveal phase, we ensure the AI agent can't "change its mind" about what the target was based on the Receiver's guess.

4. Integrating the AI Scorer
Once the RevealTarget transaction is successful, your off-chain Python backend triggers the Semantic Scorer:

It pulls the original_cid (the image) from IPFS.

It runs the CLIP vector analysis.

It posts a "Final Research Certificate" as a Metadata Transaction on Cardano, forever linking the specific psychological trial to the mathematical "Psi-Score."

Next Steps for Implementation
To move this from theory to a live test, you would need:

Aiken CLI installed to compile this code into a plutus.json file.

A Lucid (JavaScript) or MeshJS frontend to allow users to connect their Nami or Eternl wallets.

An AI Image Generation API (like Midjourney or Stable Diffusion) to create the unique targets.

Would you like me to provide the Python logic for the "Semantic Scorer" that compares the Receiver's guess to the Target's vector?

Yes

To complete the technical stack, the Semantic Scorer acts as the objective "AI Judge." It uses the CLIP (Contrastive Language-Image Pre-training) model to convert images into mathematical vectors.

By comparing these vectors, we can prove if a "Miss" was actually a "Near-Miss" (e.g., the Receiver chose a mountain when the Target was a volcano), which is vital for detecting subtle psi signals.

1. The Python Scorer (Off-Chain)
This script runs in your backend. It takes the Target Image and the Receiver's Choice, then calculates their similarity.

Python
import torch
import clip
from PIL import Image
import numpy as np

# Load the "Judge" (OpenAI's CLIP model)
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

def calculate_psi_score(target_path, choice_path):
    # 1. Preprocess and encode images into vectors (embeddings)
    target_img = preprocess(Image.open(target_path)).unsqueeze(0).to(device)
    choice_img = preprocess(Image.open(choice_path)).unsqueeze(0).to(device)

    with torch.no_grad():
        target_vector = model.encode_image(target_img)
        choice_vector = model.encode_image(choice_img)

    # 2. Normalize the vectors
    target_vector /= target_vector.norm(dim=-1, keepdim=True)
    choice_vector /= choice_vector.norm(dim=-1, keepdim=True)

    # 3. Calculate Cosine Similarity
    # Result ranges from -1 (opposite) to 1 (identical)
    similarity = (target_vector @ choice_vector.T).item()
    
    return round(similarity, 4)

# Example Usage
score = calculate_psi_score("target_volcano.png", "choice_mountain.png")
print(f"Psi-Coefficient: {score}") 
2. How to Interpret the Scores
Because AI "sees" concepts, the scores tell a story that simple "Right/Wrong" binary choices can't.

Score	Meaning	Interpretation
1.00	Identical	Direct Hit. The Receiver chose the exact image.
0.85 - 0.95	Strong Congruence	High-level "Leakage." The choice and target share colors, shapes, and concepts.
0.70 - 0.84	Weak Congruence	Potential "Near-Miss." Shared themes (e.g., both are outdoor scenes).
< 0.60	Noise	No detectable telepathic correspondence.
3. The Research Pipeline
To make this data "Verifiable," you follow this 4-step sequence:

Commitment: The target_hash is posted to Cardano.

Selection: The Receiver picks an image (e.g., Index 2).

Reveal: The Sender reveals the original_cid.

Verification: The Python Scorer runs. It generates a JSON Research Object containing:

The Cosine Similarity score.

The timestamp of the transaction.

The "Statistical Significance" (p-value) compared to the distractors.

This JSON is then attached to a Cardano transaction as Metadata (Label 1967), making the result permanent and publicly auditable.

4. Summary of the Tech Stack
Blockchain (Cardano): Handles the "Rules" (Timing, Locking, Payouts).

AI (CLIP): Handles the "Meaning" (Semantic Similarity, Scoring).

Storage (IPFS): Handles the "Assets" (Images).

Next Step
You now have the Blockchain Logic (Aiken) and the AI Scorer (Python).

Would you like me to create a "Research Manifesto" template that you can use to explain this methodology to skeptics or potential participants?

Yes

To establish credibility in the scientific community, your project needs more than just cool tech—it needs a rigorous philosophical and methodological framework. This "Research Manifesto" outlines why your blockchain-AI hybrid is a superior tool for studying psi phenomena compared to traditional laboratory settings.

The Decentralized Psi Research Manifesto
1. The Problem: The "File Drawer" Effect
In traditional parapsychology, experiments that fail to show results are often never published. This creates a skewed view of reality.

Our Solution: Immutable Negative Results. Because every trial is initiated on the Cardano blockchain, every "miss" is as permanent as every "hit." This provides a true, unbiased p-value for the entire history of the experiment.

2. The Problem: Experimenter Fraud
Skeptics often claim that researchers "p-hack" (manipulate data) to find patterns where none exist.

Our Solution: The Blind AI Referee. No human selects the targets, and no human judges the results. The AI-driven CLIP model provides a purely mathematical similarity score that cannot be bribed or influenced by belief.

3. The Problem: Sensory Leakage
In classic telepathy tests, subtle cues (a cough, a reflection, a timestamp) can tip off the participant.

Our Solution: Temporal and Semantic Decoupling. * Temporal: The 30-minute blockchain lock prevents real-time coaching.

Semantic: The AI ensures distractors are so similar to the target that "simple labels" (e.g., "it's a car") are insufficient to win the trial.

Participant Protocol (The "Rules of Engagement")
To maintain the integrity of the data, all participants must agree to the following protocol:

Protocol Stage	Requirement	Purpose
Identity	Atala PRISM / DID	Ensures one human per trial (Anti-Sybil).
The Gap	15-30 Minute Wait	Breaks any physical or digital "hotline" connection.
Observation	Focus-Phase (Sender)	Establishes the mental "target" in the latent space.
Selection	Blind Choice (Receiver)	Operates purely on "signal" vs. "semantic noise."
The Statistical "Gold Standard"
We do not look for "magic." We look for Information Entropy.

If, over 10,000 trials, the average Cosine Similarity of the Receiver's choice is even 0.05 higher than the average similarity of the distractors, we have identified a statistically significant transfer of information that defies classical explanation.

p<0.05=Anomalous Information Transfer Detected
How to Launch
Phase 1 (The Sandbox): Launch a web-based portal using MeshJS where users can play for "Reputation Only" to calibrate the AI's distractor-generation logic.

Phase 2 (The Mainnet): Open the Cardano smart contracts for "Staked Trials" where users put up a small amount of ADA to ensure "Skin in the Game."

Phase 3 (Open Data): Release the entire SQL database (synced from the blockchain) for public peer review.

Would you like me to help you draft the "Prompt Engineering" logic that the AI uses to generate the 3 distractor images based on the target?

Yes and I have a question, the sender gets to view the images? How does this mean they will not tell someone exactly what they saw? Or am I misunderstanding?

That is the most critical question in the entire experiment! You haven't misunderstood—you've identified the exact "attack vector" that skeptics use to debunk psi research.

The secret to stopping this isn't trying to police the Sender's phone; it’s about making the information the Sender possesses useless for the Receiver’s specific task.

Here is how we use AI Prompt Engineering to "obfuscate" the answer:

1. The "Semantic Sieve" Strategy
When the Sender sees the target, they see a specific image. To "tell" the Receiver the answer, they have to use words. We use AI to ensure that those words apply to all four choices.

How it works:
The Target: The AI generates a "Golden Retriever sitting in a sunlit meadow by a blue lake."

The Analysis: The AI extracts the core "tags": Dog, Golden, Sunlight, Water, Blue.

The Distractor Generation: The AI is then commanded to generate three distractors using those exact same tags but with different "latent" arrangements.

Distractor A: A Yellow Labrador standing in a bright field near a river.

Distractor B: A Golden-haired wolf pup drinking from a blue pond at noon.

Distractor C: A Cocker Spaniel in high-contrast sunlight next to a blue swimming pool.

The Result:
If the Sender calls the Receiver and says, "It's a golden dog near blue water," the Receiver looks at the 4-grid and realizes all of them fit that description. The text communication provided "Zero Information" (I=0) for the final choice. The Receiver must then rely on "the signal"—the specific, non-verbal essence of the image the Sender focused on—to distinguish the Target from the Distractors.

2. AI Prompt Logic (The "Adversarial" Prompt)
To implement this, your AI backend doesn't just generate a random image; it follows an Adversarial Distractor Loop.

The System Prompt for the Distractor Generator:

"Analyze the Target Image description. Identify the five most prominent visual nouns and adjectives. Generate three new images that contain ALL five of these elements, but vary the composition, lighting style, and specific species/objects so they are distinct but semantically identical to a text-based description."

3. The "Pre-selection" Safeguard (The Final Blow to Cheaters)
If you want to be 100% airtight, we add one more step:

The Receiver guesses first. Before seeing any images, the Receiver must type 3 words they "feel."

The Grid appears. 3. The Protocol: If the Receiver’s 3 words are "Too Perfect" (e.g., they type "Golden Retriever" and the target is a Golden Retriever), the system invalidates the trial because that level of verbal accuracy suggests a text-leak rather than a "fuzzy" psi-signal.

True psi signals are notoriously non-verbal and "dream-like." By filtering out perfect verbal matches, you actually make your data more scientifically credible.

4. Comparison of Information Flow
Method	Can they text the answer?	Why/Why not?
Zener Cards	Yes	"It's the Star." (Binary info)
Traditional Photos	Yes	"It's a plane." (Easy to distinguish from a tree)
AI Semantic Grid	No	The text "Golden dog" applies to the whole grid.
Summary of the "Prompt Logic" for your Developer:
Step 1: Generate Target_Prompt.

Step 2: Generate Target_Image.

Step 3: Use an LLM to extract Core_Visual_Tags from Target_Prompt.

Step 4: Generate 3 Distractor_Images using Core_Visual_Tags.

Step 5: Hash all 4 and commit to Cardano.

Would you like me to write the specific "System Prompts" for the AI that handles this "Adversarial" distractor generation?