export type OfflineLessonPackage = {
  version: 1;
  ownerId: string;
  lessonId: string;
  lessonVersion: string;
  downloadedAt: string;
  courseTitle: string;
  moduleTitle: string;
  title: string;
  concept: string;
  difficulty: string;
  estimatedMinutes: number;
  objective: string;
  theory: string;
  safetyNotes: string;
  practicalChallenge: string;
  expectedOutput: string;
  outcomes: Array<{ code: string; title: string; skill: string | null }>;
  hardwareVariants: Array<{
    hardwarePlatformId: string;
    hardwarePlatform: string;
    components: Array<{ quantity: number; name: string; notes: string | null }>;
    wiringInstructions: string;
    gpioMappings: string;
    codeLanguage: string;
    programmingFramework: string;
    codeSnippet: string;
    uploadProcedure: string;
    expectedOutput: string;
    troubleshooting: string;
  }>;
  practicalTasks: Array<{
    id: string;
    title: string;
    instructions: string;
    successCriteria: string;
    evidencePrompt: string;
    rubric: Array<{ label: string; maxScore: number; skill: string | null }>;
  }>;
};

export type OfflineCheckpointPayload = {
  lessonId: string;
  practicalTaskId?: string | null;
  completedSections: string[];
  notes: string;
  codeDraft: string;
  troubleshooting: string;
  clientUpdatedAt: string;
};

export type OfflineSyncOperation = {
  id: string;
  ownerId: string;
  type: "CHECKPOINT_UPSERT";
  payload: OfflineCheckpointPayload;
};
