#!/bin/bash
# Quick script to bulk label the new testing issues (337-431)
# Based on PriorityCalculator framework

REPO="steiner385/uniteDiscord"

echo "=== Phase 11: Testing Infrastructure (337-396) ==="
echo "Applying: test, foundation:l0, business-value:8, effort:2"

# Test Framework Config (337-342) - Critical foundation
for i in 337 338 339 340 341 342; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l0,business-value:8,effort:2,infrastructure" &
done
wait

# Test Database Infrastructure (343-346)
for i in 343 344 345 346; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l0,business-value:8,effort:2,infrastructure" &
done
wait

# Test Fixtures & Factories (347-354)
for i in 347 348 349 350 351 352 353 354; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:7,effort:1,parallel" &
done
wait

# MSW Mocking (355-360)
for i in 355 356 357 358 359 360; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:7,effort:2,parallel" &
done
wait

# Contract Testing (361-370)
for i in 361 362 363 364 365 366 367 368 369 370; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:8,effort:2" &
done
wait

# Performance Testing (371-375)
for i in 371 372 373 374 375; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l2,business-value:6,effort:2" &
done
wait

# Accessibility Testing (376-379)
for i in 376 377 378 379; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:8,effort:2" &
done
wait

# E2E Test Scaffolds (380-385)
for i in 380 381 382 383 384 385; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:7,effort:1,parallel" &
done
wait

# CI Pipeline Integration (386-392)
for i in 386 387 388 389 390 391 392; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l0,business-value:9,effort:2,infrastructure" &
done
wait

# Test Documentation (393-396)
for i in 393 394 395 396; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l2,business-value:5,effort:1,documentation" &
done
wait

echo "=== Phase 12: AI Model Testing (397-416) ==="
echo "Applying: test, foundation:l1, business-value:7"

# AI Unit Tests (397-400)
for i in 397 398 399 400; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:7,effort:2,parallel" &
done
wait

# AI Performance Tests (401-404)
for i in 401 402 403 404; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l2,business-value:6,effort:2,parallel" &
done
wait

# AI Contract Tests (405-408)
for i in 405 406 407 408; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:7,effort:1,parallel" &
done
wait

# Cloud LLM Tests (409-413)
for i in 409 410 411 412 413; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l2,business-value:6,effort:2" &
done
wait

# Confidence Threshold Tests (414-416)
for i in 414 415 416; do
  gh issue edit $i --repo $REPO --add-label "test,foundation:l1,business-value:8,effort:1" &
done
wait

echo "=== Phase 13: Polish (418-431) ==="
echo "Applying: polish, foundation:l3"

# Polish tasks
for i in 418 419 420 421 422 423 424 425 426 427 428 429 430 431; do
  gh issue edit $i --repo $REPO --add-label "polish,foundation:l3,business-value:5,effort:2" &
done
wait

echo "=== Done! ==="
