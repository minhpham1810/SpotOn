# Matcher evaluation on real previews

Generated 2026-11-01 by `python -m eval.run_eval` (matcher version `fp1`).
30-second iTunes previews only; background set 22 songs. Threshold in use: **7.5**
(dev negatives max 1.1, so the dev split suggests 1.6).

The threshold was fixed at 7.5 from the spike before the test split was first run, and kept: the dev
split's suggestion rests on only 12 unrelated pairs, too few to see the noise tail, and a false
"verified" badge costs more than "not confirmed". The test split was not used for tuning: it was run three
times while building, and the changes between runs were data cleaning (dropping a song's own instrumental
listed as a "sample") and plumbing (decoder, throttled iTunes lookups), never features or the threshold.

| Split | Real pairs found | Unrelated pairs wrongly found |
|---|---|---|
| dev  | 0 / 6 | 0 / 12 |
| test | 4 / 30 | 0 / 60 |

Test split: 38 Genius "samples" links from 24 seed songs, 30 had both previews on iTunes.
A miss can mean the matcher failed **or** the sampled part is outside one of the two 30 s previews;
this eval cannot tell which. Match time per pair (fingerprints cached): median 0.66s, max 1.66s.

## Test split, real pairs

| Child | Parent | Score | Found | Semitones | Speed | Mode | Child at |
|---|---|---:|:---:|---:|---:|---|---:|
| Natural Blues - Moby | Trouble So Hard - Vera Hall | 38.9 | yes | +0.00 | 1.000 | unchanged | 6.8s |
| U Can’t Touch This - MC Hammer | Super Freak - Rick James | 32.4 | yes | +0.00 | 1.010 | unchanged | 16.5s |
| Juicy - The Notorious B.I.G. | Juicy Fruit - Mtume | 28.2 | yes | +0.00 | 1.020 | turntable | 9.5s |
| Nuthin’ But A ‘G’ Thang - Dr. Dre | I Want’a Do Something Freaky To You - Leon Haywood | 21.4 | yes | +0.33 | 1.000 | unchanged | 0.3s |
| Praise You - Fatboy Slim | Lucky Man - Steve Miller Band | 3.5 |  | +7.67 | 1.094 | none | 0.8s |
| Ooh Wee - Mark Ronson | Sunny - Boney M. | 2.5 |  | -2.67 | 0.896 | none | 5.9s |
| Crazy in Love - Beyoncé | Are You My Woman? (Tell Me So) - The Chi-Lites | 2.0 |  | -2.00 | 1.020 | none | 2.7s |
| U Can’t Touch This - MC Hammer | Bring the Noise - Public Enemy | 1.4 |  | -5.00 | 0.852 | none | 13.0s |
| One More Time - Daft Punk | More Spell On You - Eddie Johns | 1.3 |  | +5.00 | 0.932 | none | 0.1s |
| Bitter Sweet Symphony - The Verve | The Last Time - The Andrew Oldham Orchestra | 1.0 |  | -7.00 | 0.811 | none | 15.4s |
| Ooh Wee - Mark Ronson | Scorpio - Dennis Coffey | 0.9 |  | -6.67 | 0.951 | none | 5.0s |
| Work It - Missy Elliott | Peter Piper - Run–DMC | 0.9 |  | +3.00 | 0.970 | none | 5.8s |
| Nuthin’ But A ‘G’ Thang - Dr. Dre | Are You Looking - Congress Alley | 0.9 |  | -4.00 | 1.083 | none | 5.2s |
| Old Town Road - Lil Nas X | 34 Ghosts IV - Nine Inch Nails | 0.5 |  | +1.00 | 1.062 | none | 14.1s |
| Hotline Bling - Drake | Why Can’t We Live Together - Timmy Thomas | 0.1 |  | +2.33 | 1.284 | none | 27.5s |
| Izzo (H.O.V.A.) - JAŸ-Z | I Want You Back - The Jackson 5 | 0.0 |  | -6.67 | 0.970 | none | 8.7s |
| Touch the Sky - Kanye West | Move On Up - Curtis Mayfield | 0.0 |  | -4.00 | 0.861 | none | 23.3s |
| Bitter Sweet Symphony - The Verve | The Last Time - The Rolling Stones | -0.0 |  | -6.67 | 1.020 | none | 4.1s |
| The World Is Yours - Nas | It’s Yours - T La Rock | -0.1 |  | +3.67 | 0.990 | none | 1.6s |
| Stan - Eminem | Thank You - Dido | -0.3 |  | +1.00 | 0.677 | none | 8.4s |
| Since I Left You - The Avalanches | Daddy Rich - Rose Royce | -0.3 |  | -6.00 | 1.323 | none | 2.9s |
| Money Trees - Kendrick Lamar | Silver Soul - Beach House | -0.4 |  | -0.33 | 1.105 | none | 24.3s |
| Gangsta’s Paradise - Coolio | Pastime Paradise - Stevie Wonder | -0.5 |  | -5.33 | 0.905 | none | 22.9s |
| Hard Knock Life (Ghetto Anthem) - JAŸ-Z | It’s the Hard-Knock Life - Aileen Quinn | -0.6 |  | +6.00 | 0.733 | none | 4.2s |
| Work It - Missy Elliott | Heart of Glass - Blondie | -0.7 |  | -3.67 | 0.932 | none | 4.5s |
| The World Is Yours - Nas | I Love Music - Ahmad Jamal Trio | -0.7 |  | -6.67 | 0.896 | none | 9.8s |
| C.R.E.A.M. - Wu-Tang Clan | Hey! Love - The Delfonics | -0.9 |  | -7.33 | 0.741 | none | 9.3s |
| Otis - JAŸ-Z | Don’t Tell a Lie About Me and I Won’t Tell the Truth on You - James Brown | -1.1 |  | +2.00 | 1.030 | none | 13.8s |
| C.R.E.A.M. - Wu-Tang Clan | As Long As I’ve Got You - The Charmels | -1.1 |  | -8.00 | 1.448 | none | 8.3s |
| Otis - JAŸ-Z | Try a Little Tenderness - Otis Redding | -1.2 |  | +8.00 | 0.923 | none | 25.1s |

## Test split, unrelated pairs (highest 10)

| Child | Parent | Score | Found | Semitones | Speed | Mode | Child at |
|---|---|---:|:---:|---:|---:|---|---:|
| I Want You Back - The Jackson 5 | Don’t Tell a Lie About Me and I Won’t Tell the Truth on You - James Brown | 3.0 |  | -0.33 | 1.477 | none | 9.7s |
| Thank You - Dido | Old Town Road - Lil Nas X | 2.0 |  | +3.00 | 0.951 | none | 14.9s |
| Work It - Missy Elliott | Hard Knock Life (Ghetto Anthem) - JAŸ-Z | 1.4 |  | -3.33 | 1.051 | none | 19.8s |
| I Love Music - Ahmad Jamal Trio | Sunny - Boney M. | 1.3 |  | +6.67 | 1.030 | none | 28.4s |
| Work It - Missy Elliott | Otis - JAŸ-Z | 1.2 |  | -2.33 | 0.980 | none | 3.3s |
| Hey! Love - The Delfonics | Why Can’t We Live Together - Timmy Thomas | 1.1 |  | +0.33 | 0.827 | none | 5.6s |
| C.R.E.A.M. - Wu-Tang Clan | Izzo (H.O.V.A.) - JAŸ-Z | 1.1 |  | -2.67 | 1.139 | none | 17.9s |
| Scorpio - Dennis Coffey | Nuthin’ But A ‘G’ Thang - Dr. Dre | 1.1 |  | +4.67 | 0.970 | none | 7.6s |
| It’s the Hard-Knock Life - Aileen Quinn | Move On Up - Curtis Mayfield | 0.9 |  | +5.33 | 0.942 | none | 22.7s |
| Thank You - Dido | Money Trees - Kendrick Lamar | 0.9 |  | -7.33 | 0.852 | none | 23.4s |

## Dev split, real pairs

| Child | Parent | Score | Found | Semitones | Speed | Mode | Child at |
|---|---|---:|:---:|---:|---:|---|---:|
| Harder Better Faster Stronger - Daft Punk | Cola Bottle Baby - Edwin Birdsong | 4.0 |  | +1.33 | 1.062 | none | 13.2s |
| Through the Wire - Kanye West | Through the Fire - Chaka Khan | 0.9 |  | +4.00 | 1.391 | none | 9.6s |
| Stronger - Kanye West | Harder Better Faster Stronger - Daft Punk | 0.5 |  | -5.67 | 1.062 | none | 8.4s |
| Ice Ice Baby - Vanilla Ice | Under Pressure - Queen | 0.3 |  | -1.67 | 1.000 | none | 12.7s |
| Can I Kick It? - A Tribe Called Quest | Walk on the Wild Side - Lou Reed | -0.2 |  | +4.33 | 0.835 | none | 4.9s |
| Gold Digger - Kanye West | I Got a Woman - Ray Charles | -0.8 |  | -2.00 | 1.139 | none | 2.1s |
