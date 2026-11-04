# EU AI Act risk classification (Regulation (EU) 2024/1689)

**Status:** reasoned academic assessment by the project owner, not legal advice. Article references
are to the Regulation as adopted. Application dates and any later amendments must be checked
against the current official text before any real-world deployment.

## Conclusion
| Scenario | Classification | Reason |
|---|---|---|
| **This project as built** (research prototype, not placed on the market) | **Outside the Regulation's scope** | Art. 2(6): AI systems developed and put into service solely for scientific research and development are excluded. Art. 2(8): research, testing and development before placing on the market is excluded |
| Public analytics / education tool (valuations shown to fans, no decisions about individuals) | Minimal / limited risk | No Annex III use. Art. 50 transparency duties concern chatbots, synthetic content, emotion recognition and biometric categorisation; none apply |
| **Club scouting / recruitment / contract decision support** | **High-risk (Annex III, point 4)** | Annex III(4)(a) covers recruitment and selection, including evaluating candidates; (4)(b) covers decisions on terms of work relationships, promotion and termination. Valuation would be used to evaluate players for signing or contracts |

## Why the recruitment case cannot use the Art. 6(3) exemption
- Art. 6(3) lets an Annex III system escape high-risk status if it poses no significant risk, for
  example because it performs a narrow procedural or preparatory task.
- The same paragraph states that an Annex III system is **always** high-risk when it performs
  **profiling of natural persons**.
- Estimating a player's market value from their individual performance data is an automated
  evaluation of personal aspects (performance at work). That fits the GDPR definition of profiling
  (GDPR Art. 4(4)), which the AI Act uses.
- The exemption is therefore not available.

## What high-risk classification would require (if repurposed)
| Obligation | Article | Current state of this project |
|---|---|---|
| Risk management system | 9 | Partly: limitations register, retraining policy, fairness re-audit on retrain |
| Data governance, including examination of biases | 10 | Strong: coverage audit, provenance, bias examination by group and league, proxy measurement |
| Technical documentation | 11, Annex IV | Partly: model card, data card, design document. No formal Annex IV dossier |
| Record-keeping / logging | 12 | Weak: model version returned per request; no persistent request log |
| Transparency to deployers | 13 | Partly: disclaimer, intended-use and limitations sections |
| Human oversight | 14 | Not designed for it: no review workflow; outputs are not decisions |
| Accuracy, robustness, cybersecurity | 15 | Partly: held-out metrics, unseen-club check, input validation. No security testing |
| Conformity assessment, registration, post-market monitoring | 43, 49, 72 | Not done |

## Defended position
- The system is classified as a **research system outside the Act's scope**, and its intended-use
  statement excludes employment-related decisions.
- Because the most plausible commercial use (scouting and recruitment) would be high-risk with no
  exemption, the project documents and audits *as if* high-risk obligations on data governance and
  bias examination (Art. 10) applied.
- That is where the main harm would arise: the audit found the model under-predicts non-UEFA players
  by about 10% relative to the target.
- Repurposing the model for recruitment would require a new conformity effort and is explicitly not
  supported.
