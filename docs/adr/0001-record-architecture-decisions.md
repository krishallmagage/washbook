# 1. Record architecture decisions

Date: 2026-08-22 · Status: Accepted

## Context

WashBook is built by one person with an AI assistant, over months, in short
sessions. Decisions made in week one will be questioned in week nine by someone
who has forgotten why — possibly the same person. Chat history does not survive;
files do.

## Decision

We record every significant architectural decision as a short ADR in
`docs/adr/`, numbered sequentially, in the format: context, decision,
consequences. Short enough to actually write, permanent enough to actually help.

An ADR is never edited to change its decision. If a decision is reversed, a new
ADR supersedes it and the old one is marked Superseded with a link.

## Consequences

- Every non-obvious choice has a findable rationale.
- "Why is this like that?" is answerable without archaeology.
- A small tax on each significant decision.
