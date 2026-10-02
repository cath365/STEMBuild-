# STEMBuild multi-microcontroller architecture

## Design rule

A learning concept is authored **once**.

STEMBuild does not create separate lessons such as:

- Read temperature — Arduino Uno
- Read temperature — ESP32
- Read temperature — Pico

Instead, the core `Lesson` stores the educational intent and the `LessonHardwareVariant` table stores implementation details for each compatible board.

## Core lesson

The core lesson owns:

- concept
- objective
- theory
- safety rules
- learning outcomes / skills
- quiz
- practical tasks
- rubric / assessment requirements
- expected learning result

These records do not change when a new microcontroller is added.

## Lesson hardware variant

A `LessonHardwareVariant` belongs to exactly one core lesson and one `HardwarePlatform`.

It stores:

- wiring instructions
- GPIO / pin mappings
- programming language
- programming framework / toolchain
- source code
- upload / flashing procedure
- board-specific expected output
- board-specific troubleshooting
- components

The compound unique constraint `lessonId + hardwarePlatformId` prevents duplicate variants for the same board.

## Project hardware variant

Projects use the same pattern. `Project` owns:

- project description
- learning purpose
- success criteria
- rubric
- assessment

`ProjectHardware` owns the board-specific implementation:

- wiring
- GPIO map
- language/framework
- source code
- upload procedure
- expected output
- troubleshooting

A learner selects a compatible board at the start of a project attempt. That board is recorded in `PROJECT_STARTED` and `HARDWARE_PLATFORM_SELECTED` events and is locked to the attempt through submission.

## Supported seed platforms

The DEMO catalog includes:

- Arduino Uno
- Arduino Nano
- ESP32
- Raspberry Pi Pico
- BBC micro:bit
- STM32

The architecture does not contain an enum or React switch statement for those names.

## Adding another board

An administrator can:

1. open **Admin → Hardware**;
2. create a new `HardwarePlatform`;
3. open **Admin → Board variants**;
4. attach the board to an existing lesson or project;
5. enter the wiring, GPIO map, framework, code, upload procedure and troubleshooting guidance.

The student selector reads the resulting database rows. No application-code change is required.

## Learner behavior

The board selector receives an array of variants from the server and renders the available platform names dynamically.

Selecting a board changes only the implementation panel. The learner continues to see the same:

- concept
- objective
- skills
- quiz
- practical assessment
- teacher rubric

This makes scores comparable across boards because the educational target is shared.

## Attempt integrity

The platform records the selected `hardwarePlatformId` when a practical/project attempt begins.

Submission is rejected if the learner tries to submit under a different board ID. This protects:

- analytics by hardware platform;
- troubleshooting history;
- evidence interpretation;
- shared-kit records;
- fair comparisons between board variants.

## Offline behavior

Downloaded lessons include all configured board variants so the learner can still select/read board-specific instructions while offline.

Assessment answers, final evidence submission, teacher grading and authoritative completion remain online-only.
