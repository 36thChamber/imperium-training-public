import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState as NativeAppState,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFonts } from "expo-font";
import { Cinzel_600SemiBold } from "@expo-google-fonts/cinzel/600SemiBold";
import { Cinzel_700Bold } from "@expo-google-fonts/cinzel/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { ShareTechMono_400Regular } from "@expo-google-fonts/share-tech-mono/400Regular";
import ComicAvatar from "./components/ComicAvatar";
import AvatarEditor from "./components/AvatarEditor";
import ExercisePicker from "./components/ExercisePicker";
import { EXERCISE_LIBRARY, draftSet, restoreRoutines, restoreWorkoutDraft, type WorkoutDraft as Draft } from "./exercises";
import { GoalsPanel, GoalsPreview } from "./components/GoalsPanel";
import WellnessPanel from "./components/WellnessPanel";
import { TrainingWeek } from "./components/TrainingWeek";
import { HabitMissions } from "./components/HabitMissions";
import { weeklyTrainingDays, type GoalBook } from "./goals";
import type { WellnessState } from "./wellness";
import { CogitatorBackdrop, CogitatorFrame, Scanlines, GothicDivider } from "./components/Cogitator";
import { ImperialMark } from "./components/ImperialMark";
import { Icon, Button, Label, Section, Progress, Metric, Sheet } from "./ui";
import { C, s } from "./styles";
import {
  ARMOURS,
  RANKS,
  INITIAL_STATE,
  createProfile,
  hydrateState,
  canEquip,
  completeSession,
  getRank,
  getNextRank,
  getStats,
  getWeeklyActivity,
  getMeritoriousSessions,
  localDateKey,
  type AppState,
  type Armour,
  type AvatarConfig,
  type Routine,
  type Exercise,
  type Sex,
  type Session,
} from "./domain";

const STORE = "@imperium/state/v1",
  DRAFT = "@imperium/workout/v1",
  CUSTOM = "@imperium/routines/v1";
type Tab = "home" | "train" | "campaign" | "goals" | "armour" | "profile";
type HomeSection = "recovery" | "nutrition";
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const numeric = (v: string) => Number(v.trim().replace(",", "."));
const format = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const haptic = () => {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};

function Sanctum() {
  return <Image source={require('../assets/avatar-comic/camara.jpg')} accessible={false} pointerEvents="none" resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ImperiumApp />
    </SafeAreaProvider>
  );
}
function ImperiumApp() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ShareTechMono_400Regular,
  });
  const [loaded, setLoaded] = useState(false),
    [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loadFailed, setLoadFailed] = useState(false),
    [loadAttempt, setLoadAttempt] = useState(0);
  const params = useLocalSearchParams<{ tab?: string; view?: string }>();
  const tab: Tab = ["home", "train", "campaign", "goals", "armour", "profile"].includes(
    params.tab ?? "",
  )
    ? (params.tab as Tab)
    : "home";
  const [name, setName] = useState(""),
    [sex, setSex] = useState<Sex>("masculino");
  const [enlistmentAvatars, setEnlistmentAvatars] = useState<Partial<Record<Sex, AvatarConfig>>>({});
  const [draft, setDraft] = useState<Draft | null>(null),
    [workoutOpen, setWorkoutOpen] = useState(false),
    [tick, setTick] = useState(() => Date.now()),
    [restUntil, setRestUntil] = useState(0);
  const [summary, setSummary] = useState<{
    xp: number;
    sets: number;
    minutes: number;
  } | null>(null);
  const [selectedArmour, setSelectedArmour] = useState<Armour | null>(null),
    [avatarOpen, setAvatarOpen] = useState(false),
    [avatarDraft, setAvatarDraft] = useState<AvatarConfig | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false),
    [loreOpen, setLoreOpen] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [storageError, setStorageError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false),
    [formError, setFormError] = useState(""),
    [toast, setToast] = useState("");
  const [customRoutines, setCustomRoutines] = useState<Routine[]>([]),
    [builderOpen, setBuilderOpen] = useState(false),
    [routineName, setRoutineName] = useState(""),
    [chosenExercises, setChosenExercises] = useState<Exercise[]>([]),
    [pickerOpen, setPickerOpen] = useState(false),
    [routinePickerOpen, setRoutinePickerOpen] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null),
    writeQueue = useRef(Promise.resolve()),
    finishing = useRef(false);
  const [today, setToday] = useState(() => localDateKey());
  useEffect(() => {
    // A suspended iPhone can skip the midnight timer.
    const refreshDay = () => setToday(localDateKey());
    const foreground = NativeAppState.addEventListener("change", status => {
      if (status === "active") refreshDay();
    });
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(refreshDay, midnight.getTime() - Date.now() + 50);
    return () => { foreground.remove(); clearTimeout(timer); };
  }, [today]);
  const weekDays = weeklyTrainingDays(state.sessions);
  const { width } = useWindowDimensions();
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORE),
      AsyncStorage.getItem(DRAFT),
      AsyncStorage.getItem(CUSTOM),
    ])
      .then(([raw, pending, routines]) => {
        const restored = hydrateState(raw);
        setState(restored);
        if (pending) {
          try {
            const active = restoreWorkoutDraft(JSON.parse(pending));
            if (active && !restored.sessions.some(session => session.id === active.id)) {
              setDraft(active);
              setPickerOpen(!active.sets.length);
            }
          } catch {}
        }
        if (routines) {
          try {
            setCustomRoutines(restoreRoutines(JSON.parse(routines)));
          } catch {}
        }
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoaded(true));
  }, [loadAttempt]);
  useEffect(() => {
    if (!loaded || loadFailed) return;
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(() =>
        AsyncStorage.multiSet([
          [STORE, JSON.stringify(state)],
          [DRAFT, JSON.stringify(draft)],
          [CUSTOM, JSON.stringify(customRoutines)],
        ]),
      )
      .catch(() =>
        setStorageError(
          "Não foi possível salvar. Mantenha o app aberto e tente novamente.",
        ),
      );
  }, [loaded, loadFailed, state, draft, customRoutines]);
  useEffect(() => {
    if (!draft && !restUntil) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [draft, restUntil]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    finishing.current = false;
  }, [draft?.id]);
  const profile = state.profile,
    faction =
      profile?.faction ?? (sex === "feminino" ? "sororitas" : "astartes");
  const rank = getRank(faction, state.xp),
    nextRank = getNextRank(faction, state.xp);
  const stats = React.useMemo(() => getStats({ sessions: state.sessions }), [state.sessions]);
  const activity = React.useMemo(() => getWeeklyActivity({ sessions: state.sessions }, new Date(today + "T12:00:00")), [state.sessions, today]);
  const activeArmour =
    ARMOURS.find((a) => a.id === state.equipped[faction]) ??
    ARMOURS.find((a) => a.faction === faction)!;
  const appearance = profile?.avatar ?? enlistmentAvatars[sex] ?? createProfile(name, sex).avatar;
  const library = React.useMemo(() => {
    const catalog = new Map(EXERCISE_LIBRARY.map(exercise => [exercise.id, exercise]));
    for (const routine of customRoutines) for (const exercise of routine.exercises) catalog.set(exercise.id, exercise);
    for (const session of state.sessions) for (const set of session.sets) {
      if (!set.exerciseName) continue;
      catalog.set(set.exerciseId, { id: set.exerciseId, name: set.exerciseName,
        muscle: set.muscleGroups?.join(", ") ?? "", muscleGroups: set.muscleGroups ?? [],
        sets: 1, reps: 0, equipment: catalog.get(set.exerciseId)?.equipment ?? "" });
    }
    return [...catalog.values()];
  }, [customRoutines, state.sessions]);
  const rankProgress = nextRank
    ? (state.xp - rank.xp) / (nextRank.xp - rank.xp)
    : 1;
  const navigate = useCallback((next: Tab, view = "") => {
    haptic();
    router.setParams({ tab: next, view });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);
  const openMission = (destination: HomeSection | "goals" | "activity") => {
    if (destination === "goals") { navigate("goals"); return; }
    navigate("home", destination);
  };
  const changeWater = (delta: number) => setState(old => {
    const date = localDateKey();
    const water = (old.waterDate === date ? old.water : 0) + delta;
    return { ...old, waterDate: date, water: Math.min(10000, Math.max(0, water)) };
  });
  const updateGoals = (update: (book: GoalBook) => GoalBook) =>
    setState(old => ({ ...old, goals: update(old.goals) }));
  const updateWellness = (update: (previous: WellnessState) => WellnessState) =>
    setState(old => ({ ...old, wellness: update(old.wellness) }));
  const startWorkout = useCallback(
    (routine?: Routine) => {
      if (draft) {
        setWorkoutOpen(true);
        return;
      }
      setTick(Date.now());
      setPickerOpen(!routine);
      setDraft({
        id: uid(),
        routineId: routine?.id ?? "free",
        routineName: routine?.name ?? "Treino livre",
        startedAt: new Date().toISOString(),
        sets: routine?.exercises.flatMap(e => Array.from({ length: e.sets }, () => draftSet(e))).slice(0, 100) ?? [],
      });
      setFormError("");
      setWorkoutOpen(true);
    },
    [draft],
  );
  const updateSet = (index: number, key: "weight" | "reps", value: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            sets: d.sets.map((row, i) =>
              i === index ? { ...row, [key]: value, completed: false } : row,
            ),
          }
        : d,
    );
  const toggleSet = (index: number) => {
    if (!draft) return;
    const row = draft.sets[index];
    if (
      !row.reps.trim() ||
      !row.weight.trim() ||
      !Number.isInteger(numeric(row.reps)) ||
      numeric(row.reps) < 1 ||
      numeric(row.reps) > 1000 ||
      !Number.isFinite(numeric(row.weight)) ||
      numeric(row.weight) < 0 ||
      numeric(row.weight) > 2000
    ) {
      setFormError("Informe repetições de 1 a 1.000 e carga de 0 a 2.000 kg.");
      return;
    }
    setFormError("");
    haptic();
    setDraft((d) =>
      d
        ? {
            ...d,
            sets: d.sets.map((x, i) =>
              i === index ? { ...x, completed: !x.completed } : x,
            ),
          }
        : d,
    );
    if (!row.completed) setRestUntil(Date.now() + 90000);
  };
  const finishWorkout = () => {
    if (!draft || finishing.current) return;
    const sets = draft.sets
      .filter((x) => x.completed)
      .map((x) => ({ ...x, reps: numeric(x.reps), weight: numeric(x.weight) }));
    if (!sets.length) {
      setFormError("Marque ao menos uma série concluída para salvar.");
      return;
    }
    const session: Session = {
      id: draft.id,
      routineId: draft.routineId,
      routineName: draft.routineName,
      startedAt: draft.startedAt,
      endedAt: new Date().toISOString(),
      sets,
      xp: 0,
    };
    const updated = completeSession(state, session);
    if (updated === state) {
      setFormError(
        "Não foi possível registrar esta sessão. Sessões devem durar menos de 24 horas. Descarte um treino antigo para iniciar outro.",
      );
      return;
    }
    finishing.current = true;
    setSummary({
      xp: updated.xp - state.xp,
      sets: sets.length,
      minutes: Math.max(
        0,
        Math.round((Date.now() - Date.parse(draft.startedAt)) / 60000),
      ),
    });
    setState(updated);
    setDraft(null);
    setWorkoutOpen(false);
    setRestUntil(0);
    navigate("home");
  };
  const equip = (armour: Armour) => {
    if (!canEquip(armour, state)) return;
    setState((old) => ({
      ...old,
      equipped: { ...old.equipped, [faction]: armour.id },
      profile: old.profile
        ? {
            ...old.profile,
            avatar: { ...old.profile.avatar, armourId: armour.id },
          }
        : null,
    }));
    haptic();
    setSelectedArmour(null);
    setToast("Equipamento requisitado. Honre seu legado.");
  };
  const saveRoutine = () => {
    if (!routineName.trim() || !chosenExercises.length) {
      setFormError("Dê um nome e escolha ao menos um exercício.");
      return;
    }
    setCustomRoutines((rs) => [
      ...rs,
      {
        id: uid(),
        name: routineName.trim(),
        subtitle: "Sua rotina personalizada",
        minutes: 0,
        exercises: chosenExercises,
      },
    ]);
    setBuilderOpen(false);
    setToast("Rotina criada. Pronta para o próximo treino.");
  };
  const avatar = (
    size: number,
    config = appearance,
    headOnly = false,
  ) => (
    <ComicAvatar
      {...config}
      faction={faction}
      pattern={activeArmour.pattern}
      armourId={activeArmour.id}
      size={size}
      headOnly={headOnly}
    />
  );
  const editAvatar = () => {
    setAvatarDraft({ ...appearance });
    setAvatarOpen(true);
  };
  if (!loaded || (!fontsLoaded && !fontError))
    return (
      <View style={[s.root, { justifyContent: "center" }]}>
        <ActivityIndicator color={C.gold} />
        <Text style={[s.label, { marginTop: 20 }]}>INICIANDO O COGITADOR</Text>
      </View>
    );

  if (loadFailed)
    return (
      <SafeAreaView style={[s.app, { padding: 24, justifyContent: "center" }]}>
        <Text style={s.title}>Seu registro está protegido.</Text>
        <Text style={s.bodyMuted}>
          Não foi possível abrir os dados locais. Tente novamente para continuar
          sem sobrescrever seus registros.
        </Text>
        <Button
          title="Tentar carregar novamente"
          onPress={() => {
            setLoaded(false);
            setLoadFailed(false);
            setLoadAttempt((value) => value + 1);
          }}
        />
      </SafeAreaView>
    );

  const wellnessSection = (section: HomeSection) => (
      <WellnessPanel key={section} section={section} initialMapMode={params.view === "recovery" ? "recovery" : "activity"}
        wellness={state.wellness} sessions={state.sessions}
        water={state.waterDate === today ? state.water : 0} onWaterChange={changeWater} onChange={updateWellness}/>
  );
  const focusedSection = params.view === "nutrition" ? "nutrition" : (params.view === "activity" || params.view === "recovery" ? "recovery" : null);
  const home = () => focusedSection ? (
    <View key={params.view}>
      <Pressable accessibilityRole="button" onPress={() => navigate("home")} style={[s.row, s.textButton, { alignSelf: "flex-start" }]}>
        <Icon name="chevron-back" size={16}/><Text style={s.link}>Voltar ao Comando</Text>
      </Pressable>
      {wellnessSection(focusedSection)}
    </View>
  ) : (
    <>
      <TrainingWeek days={weekDays} goal={state.goals.weeklyDays} portrait={avatar(119)}
        faction={faction === "astartes" ? "Adeptus Astartes" : "Adepta Sororitas"}
        rank={rank.name} active={!!draft} onStart={() => startWorkout()} onCampaign={() => navigate("campaign")}/>
      {wellnessSection("recovery")}
      <GoalsPreview book={state.goals} sessions={state.sessions} onOpen={() => navigate("goals")}/>
      {wellnessSection("nutrition")}
    </>
  );
  const training = () => (
    <>
      <Label>REGISTRO DE TREINO</Label>
      <Text style={s.title}>Campo de treino</Text>
      <Text style={s.intro}>Escolha os exercícios na hora ou comece com uma rotina sua.</Text>
      {draft && (
        <View style={[s.card, { borderColor: C.gold, marginTop: 20 }]}>
          <Label>TREINO EM ANDAMENTO</Label>
          <Text style={s.cardTitle}>{draft.routineName}</Text>
          <Text style={s.bodyMuted}>
            {draft.sets.filter((x) => x.completed).length} de{" "}
            {draft.sets.length} séries concluídas
          </Text>
          <Button
            title="Continuar treino"
            onPress={() => setWorkoutOpen(true)}
            icon="play"
          />
        </View>
      )}
      {!draft && <Button title="Iniciar treino livre" icon="add" onPress={() => startWorkout()}/>}
      <Section title="Minhas rotinas" action="Criar rotina" onPress={() => {
        setRoutineName(""); setChosenExercises([]); setRoutinePickerOpen(false);
        setFormError(""); setBuilderOpen(true);
      }}/>
      {!customRoutines.length && <Text style={s.bodyMuted}>Salve os exercícios que você costuma repetir numa rotina sua.</Text>}
      {customRoutines.map(routine => (
        <View key={routine.id} style={[s.card, { marginBottom: 14 }]}>
          <Text style={s.cardTitle}>{routine.name}</Text>
          {routine.exercises.map(e => <View key={e.id} style={s.exercisePreview}>
            <Icon name="barbell-outline" size={17}/><View style={{ flex: 1 }}>
              <Text style={s.body}>{e.name}</Text><Text style={s.meta}>{e.muscle}</Text>
            </View><Text style={s.setCount}>{e.reps ? `${e.sets} × ${e.reps}` : `${e.sets} ${e.sets === 1 ? "série" : "séries"}`}</Text>
          </View>)}
          <Button title={draft ? "Retomar treino ativo" : "Iniciar treino"} icon="play" onPress={() => startWorkout(routine)} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover rotina ${routine.name}`}
            onPress={() => setCustomRoutines(rs => rs.filter(r => r.id !== routine.id))} style={s.textButton}>
            <Text style={s.bodyMuted}>Remover rotina</Text></Pressable>
        </View>
      ))}
    </>
  );
  const campaign = () => (
    <>
      <Label>
        {faction === "astartes" ? "ADEPTUS ASTARTES" : "ADEPTA SORORITAS"} ·
        PROGRESSÃO
      </Label>
      <Text style={s.title}>Sua cruzada</Text>
      <Text style={s.intro}>Um legado conquistado a cada sessão.</Text>
      <View style={[s.rankCard, { marginTop: 24 }]}>
        <ImperialMark size={62} />
        <View style={{ flex: 1 }}>
          <Label>{rank.name.toUpperCase()}</Label>
          <Text style={s.xpValue}>
            {format(state.xp)} <Text style={s.meta}>XP</Text>
          </Text>
          <Progress value={rankProgress} />
          <Text style={[s.meta, { marginTop: 8 }]}>
            {nextRank
              ? `${format(nextRank.xp - state.xp)} XP para ${nextRank.name}`
              : "Último marco alcançado"}
          </Text>
        </View>
      </View>
      <HabitMissions state={state} weekDays={weekDays.size} onOpen={openMission}/>
      <Section title="Caminho da ascensão" />
      <View style={s.path}>
        {RANKS[faction].map((r, i) => {
          const unlocked = state.xp >= r.xp,
            current = r.id === rank.id;
          return (
            <View key={r.id} style={s.pathRow}>
              <View style={s.pathRail}>
                <View
                  style={[
                    s.rankNode,
                    unlocked && {
                      borderColor: C.gold,
                      backgroundColor: C.gold,
                    },
                    current && { backgroundColor: C.bg },
                  ]}
                >
                  <Icon
                    name={
                      current
                        ? "shield-half"
                        : unlocked
                          ? "checkmark"
                          : "lock-closed-outline"
                    }
                    color={
                      unlocked && !current ? C.bg : unlocked ? C.gold : C.muted
                    }
                    size={21}
                  />
                </View>
                {i < RANKS[faction].length - 1 && (
                  <View
                    style={[
                      s.pathLine,
                      unlocked && { backgroundColor: "#736342" },
                    ]}
                  />
                )}
              </View>
              <View style={[s.pathCard, current && { borderColor: C.gold }]}>
                <View style={s.rowBetween}>
                  <Label>MARCO {String(i + 1).padStart(2, "0")}</Label>
                  <Text style={s.meta}>{format(r.xp)} XP</Text>
                </View>
                <Text style={[s.cardTitle, !unlocked && { color: "#9EA4A5" }]}>
                  {r.name}
                </Text>
                <Text style={s.bodyMuted}>{r.description}</Text>
                {current && (
                  <View style={s.currentTag}>
                    <Text style={s.currentTagText}>VOCÊ ESTÁ AQUI</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setLoreOpen(true)}
        style={s.infoLine}
      >
        <Icon name="book-outline" />
        <Text style={[s.bodyMuted, { flex: 1 }]}>
          XP e marcos são adaptações do app. Consulte a lore que orienta sua
          campanha.
        </Text>
      </Pressable>
    </>
  );
  const armour = () => (
    <>
      <View style={s.rowBetween}>
        <View>
          <Label>REQUISIÇÕES AUTORIZADAS</Label>
          <Text style={s.title}>O arsenal</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar aparência"
          onPress={editAvatar}
          style={s.iconButton}
        >
          <Icon name="options-outline" />
        </Pressable>
      </View>
      <CogitatorFrame style={{ marginBottom: 22 }} label="CÂMARA DE PARAMENTAÇÃO">
      <View style={[s.armourStage, { borderWidth: 0, marginTop: 0, marginBottom: 0 }]}>
        <Sanctum />
        <View style={s.stageLabel}>
          <Label>
            {faction === "astartes" ? "ADEPTUS ASTARTES" : "ADEPTA SORORITAS"}
          </Label>
          <Text style={s.stageNumber}>
            ARM. / {String(ARMOURS.indexOf(activeArmour) + 1).padStart(2, "0")}
          </Text>
        </View>
        <View style={{ position: 'relative', zIndex: 1 }}>{avatar(Math.min(320, width - 64))}</View>
        <View style={s.armourPlaque}>
          <Label>EM USO</Label>
          <Text style={s.cardTitle}>{activeArmour.name}</Text>
        </View>
      </View>
      </CogitatorFrame>
      <View style={s.rowBetween}>
        <Text style={s.sectionTitle}>Armaduras & relíquias</Text>
        <Text style={s.meta}>
          {
            ARMOURS.filter((a) => a.faction === faction && canEquip(a, state))
              .length
          }{" "}
          / {ARMOURS.filter((a) => a.faction === faction).length}
        </Text>
      </View>
      {state.equipmentTesting && <Text style={[s.meta, { marginBottom: 12 }]}>Trajes liberados para teste</Text>}
      <View style={s.armourGrid}>
        {ARMOURS.filter((a) => a.faction === faction).map((a) => {
          const unlocked = canEquip(a, state),
            equipped = a.id === activeArmour.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Detalhes: ${a.name}`}
              key={a.id}
              onPress={() => setSelectedArmour(a)}
              style={[s.armourItem, equipped && { borderColor: C.gold }]}
            >
              <View style={s.armourItemTop}>
                <Text style={[s.micro, { color: equipped ? C.gold : C.muted }]}>
                  {equipped
                    ? "EQUIPADO"
                    : unlocked
                      ? "DISPONÍVEL"
                      : "BLOQUEADO"}
                </Text>
                <Icon
                  name={
                    equipped
                      ? "checkmark-circle"
                      : unlocked
                        ? "add-circle-outline"
                        : "lock-closed-outline"
                  }
                  size={16}
                />
              </View>
              <View
                style={{
                  height: 140,
                  overflow: "hidden",
                  alignItems: "center",
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <ComicAvatar
                  {...appearance}
                  faction={faction}
                  pattern={a.pattern}
                  armourId={a.id}
                  size={155}
                  helmet
                />
              </View>
              <Text style={s.armourName}>{a.name}</Text>
              <Text style={s.meta}>
                {a.requiredXp === 0
                  ? "Equipamento inicial"
                  : `${format(a.requiredXp)} XP${a.requiredSessions ? ` · ${a.requiredSessions} treinos com XP` : ""}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setLoreOpen(true)}
        style={s.infoLine}
      >
        <Icon name="book-outline" />
        <Text style={[s.bodyMuted, { flex: 1 }]}>
          Padrões de armadura não são patentes. O arsenal respeita a facção e a
          veterania.
        </Text>
      </Pressable>
    </>
  );
  const profileScreen = () => (
    <>
      <View style={s.rowBetween}>
        <View>
          <Label>REGISTRO DO IMPERIUM</Label>
          <Text style={s.title}>Seu legado</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          style={s.iconButton}
          onPress={() => {
            setName(profile!.name);
            setSettingsOpen(true);
          }}
        >
          <Icon name="settings-outline" />
        </Pressable>
      </View>
      <View style={s.profileCard}>
        <View style={s.portrait}>{avatar(108, profile?.avatar, true)}</View>
        <Text style={s.profileName}>{profile!.name}</Text>
        <Text style={s.profileRank}>{rank.name}</Text>
        <Text style={s.micro}>
          {faction === "astartes" ? "ADEPTUS ASTARTES" : "ADEPTA SORORITAS"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Personalizar avatar"
          onPress={editAvatar}
          style={s.profileEdit}
        >
          <Icon name="create-outline" size={16} />
          <Text style={s.link}>Personalizar avatar</Text>
        </Pressable>
      </View>
      <View style={s.metrics}>
        <Metric
          value={String(stats.workouts)}
          label="SESSÕES"
          icon="barbell-outline"
        />
        <Metric
          value={format(stats.totalMinutes)}
          label="MINUTOS"
          icon="time-outline"
        />
        <Metric
          value={format(stats.volume)}
          label="VOLUME · KG"
          icon="layers-outline"
        />
      </View>
      <Section title="Últimos 7 dias" />
      <View style={s.card}>
        <View style={s.chart}>
          {activity.map((d) => (
            <View style={s.chartColumn} key={d.date}>
              <Text style={s.meta}>{d.count || "—"}</Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.bar,
                    {
                      height: d.count
                        ? Math.max(
                            8,
                            (d.count /
                              Math.max(1, ...activity.map((x) => x.count))) *
                              76,
                          )
                        : 2,
                      backgroundColor: d.count ? C.gold : C.line,
                    },
                  ]}
                />
              </View>
              <Text style={s.dayLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.meta, { textAlign: "center", marginTop: 15 }]}>
          Sessões registradas por dia
        </Text>
      </View>
      <Section
        title="Treinos recentes"
        action="Ver tudo"
        onPress={() => setHistoryOpen(true)}
      />
      <View style={s.card}>
        {state.sessions.length ? (
          state.sessions
            .slice(-3)
            .reverse()
            .map((session) => (
              <View key={session.id} style={s.historyRow}>
                <View style={s.smallSeal}>
                  <Icon name="checkmark" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.body}>{session.routineName}</Text>
                  <Text style={s.meta}>
                    {new Date(session.endedAt).toLocaleDateString("pt-BR")} ·{" "}
                    {session.sets.length} séries
                  </Text>
                </View>
                <Text style={s.reward}>+{session.xp} XP</Text>
              </View>
            ))
        ) : (
          <View style={s.empty}>
            <Icon name="journal-outline" size={30} />
            <Text style={s.body}>Seu legado começa no primeiro treino.</Text>
            <Button
              title="Registrar meu primeiro treino"
              secondary
              onPress={() => navigate("train")}
            />
          </View>
        )}
      </View>
      <Section title="Nutrição"/>
      <Button title="Abrir diário de nutrição" secondary icon="restaurant-outline" onPress={() => openMission("nutrition")}/>
    </>
  );

  return (
    <View style={s.root}>
      <CogitatorBackdrop />
      <StatusBar style="light" />
      {width > 800 && (
        <View style={s.desktopBrand}>
          <ImperialMark size={80} />
          <Text style={s.desktopTitle}>IMPERIUM</Text>
          <Text style={s.desktopSubtitle}>T R A I N I N G</Text>
          <View style={s.desktopRule} />
          <Text style={s.desktopCaption}>
            O corpo se fortalece.{"\n"}O legado permanece.
          </Text>
          <Text style={[s.micro, { marginTop: 30 }]}>
            UMA CRUZADA A CADA TREINO
          </Text>
        </View>
      )}
      <SafeAreaView
        style={[
          s.app,
          width > 800 && { marginLeft: Math.min(width * 0.38, 500) },
        ]}
        edges={["top", "bottom"]}
      >
        {!profile ? (
          <ScrollView
            contentContainerStyle={s.onboarding}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.brandRow}>
              <ImperialMark size={43} />
              <View>
                <Text style={s.brand}>IMPERIUM</Text>
                <Text style={s.brandSmall}>T R A I N I N G</Text>
              </View>
            </View>
            <View style={s.onboardArt}>
              <Sanctum />
              <View style={{ position: 'relative', zIndex: 1 }}>
                {avatar(270)}
              </View>
              <Scanlines opacity={0.045} />
            </View>
            <GothicDivider />
            <Label>SEU TREINO. SUA CRUZADA.</Label>
            <Text style={[s.title, { fontSize: 30, textAlign: "center" }]}>
              Construa seu legado.
            </Text>
            <Text style={[s.intro, { textAlign: "center", marginTop: 10 }]}>
              Transforme disciplina em experiência.{"\n"}Conquiste seu lugar no
              Imperium.
            </Text>
            <View style={{ alignSelf: "stretch", marginTop: 26 }}>
              <Label>COMO DEVEMOS CHAMAR VOCÊ?</Label>
              <TextInput
                accessibilityLabel="Seu nome"
                placeholder="Seu nome"
                placeholderTextColor={C.muted}
                value={name}
                onChangeText={setName}
                maxLength={32}
                style={s.input}
              />
              <Label>SEXO · DEFINE A CAMPANHA</Label>
              <View style={[s.row, { marginTop: 10 }]}>
                {(["masculino", "feminino"] as Sex[]).map((x) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: sex === x }}
                    aria-selected={sex === x}
                    key={x}
                    onPress={() => setSex(x)}
                    style={[s.factionChoice, sex === x && s.choiceSelected]}
                  >
                    <Icon
                      name={x === "masculino" ? "shield-half" : "flame-outline"}
                      size={22}
                    />
                    <Text style={s.choiceTitle}>
                      {x === "masculino" ? "Masculino" : "Feminino"}
                    </Text>
                    <Text style={s.choiceCaption}>
                      {x === "masculino"
                        ? "Adeptus Astartes"
                        : "Adepta Sororitas"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[s.meta, { marginTop: 12, lineHeight: 18 }]}>
                Sua campanha muda a narrativa e o arsenal. Os exercícios podem
                ser personalizados em qualquer caminho.
              </Text>
              <Button title="Personalizar avatar" secondary icon="color-palette-outline" onPress={editAvatar} />
              <Button
                title="Iniciar minha campanha"
                disabled={!name.trim()}
                icon="arrow-forward"
                onPress={() => {
                  setState({
                    ...INITIAL_STATE,
                    profile: { ...createProfile(name.trim(), sex), avatar: appearance },
                  });
                  haptic();
                }}
              />
            </View>
            <Text style={[s.micro, { textAlign: "center", marginTop: 20 }]}>
              PROJETO DE FÃ · NÃO OFICIAL
            </Text>
          </ScrollView>
        ) : (
          <>
            <View style={s.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir perfil"
                onPress={() => navigate("profile")}
                style={s.headerIdentity}
              >
                <View style={s.headerMark}>
                  <ImperialMark size={32} />
                </View>
                <View>
                  <Text style={[s.headerName, {maxWidth: 135}]} numberOfLines={1}>{profile.name}</Text>
                  <Text style={s.headerRank}>{rank.name}</Text>
                </View>
              </Pressable>
              <View style={s.headerStats}>
                <Icon name="calendar-outline" size={19} />
                <Text accessibilityLabel={`${weekDays.size} ${weekDays.size === 1 ? 'dia' : 'dias'} de treino nesta semana`} style={s.headerValue}>{weekDays.size}</Text>
                <View style={s.verticalRule} />
                <Icon name="sparkles-outline" size={16} />
                <Text style={s.headerValue}>{format(state.xp)}</Text>
              </View>
            </View>
            {storageError && (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>{storageError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    AsyncStorage.multiSet([
                      [STORE, JSON.stringify(state)],
                      [DRAFT, JSON.stringify(draft)],
                      [CUSTOM, JSON.stringify(customRoutines)],
                    ])
                      .then(() => setStorageError(""))
                      .catch(() => {});
                  }}
                >
                  <Text style={s.link}>Tentar salvar</Text>
                </Pressable>
              </View>
            )}
            {draft && !workoutOpen && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setWorkoutOpen(true)}
                style={s.activeBanner}
              >
                <Icon name="pulse" size={17} />
                <Text style={s.activeText}>Treino em andamento</Text>
                <Text style={s.reward}>
                  {clock(
                    Math.max(0, (tick - Date.parse(draft.startedAt)) / 1000),
                  )}
                </Text>
                <Icon name="chevron-forward" size={16} />
              </Pressable>
            )}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={s.content}
              showsVerticalScrollIndicator={false}
            >
              {tab === "home"
                ? home()
                : tab === "train"
                  ? training()
                  : tab === "goals"
                    ? <GoalsPanel book={state.goals} sessions={state.sessions} exercises={library} onChange={updateGoals}/>
                  : tab === "campaign"
                    ? campaign()
                    : tab === "armour"
                      ? armour()
                      : profileScreen()}
            </ScrollView>
            <View style={s.tabBar}>
              {(
                [
                  { id: "home", label: "Comando", icon: "grid-outline" },
                  { id: "train", label: "Treino", icon: "barbell-outline" },
                  { id: "goals", label: "Objetivos", icon: "flag-outline" },
                  {
                    id: "campaign",
                    label: "Cruzada",
                    icon: "shield-half-outline",
                  },
                  { id: "armour", label: "Arsenal", icon: "shirt-outline" },
                  { id: "profile", label: "Perfil", icon: "person-outline" },
                ] as const
              ).map((t) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: tab === t.id }}
                  aria-selected={tab === t.id}
                  onPress={() => navigate(t.id)}
                  key={t.id}
                  style={s.tab}
                >
                  <View
                    style={[
                      s.tabIndicator,
                      tab === t.id && { backgroundColor: C.gold },
                    ]}
                  />
                  <Icon
                    name={t.icon}
                    color={tab === t.id ? C.gold : C.muted}
                    size={21}
                  />
                  <Text style={[s.tabLabel, tab === t.id && { color: C.gold }]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {!!toast && (
          <View style={s.toast}>
            <Icon name="checkmark-circle-outline" />
            <Text style={[s.body, { flex: 1 }]}>{toast}</Text>
          </View>
        )}
      </SafeAreaView>
      <Modal
        visible={workoutOpen && !!draft}
        animationType="slide"
        onRequestClose={() => setWorkoutOpen(false)}
      >
        <SafeAreaView style={s.workoutRoot}>
          <StatusBar style="light" />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={s.workoutHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Minimizar treino"
                onPress={() => setWorkoutOpen(false)}
                style={s.iconButton}
              >
                <Icon name="chevron-down" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Label>TREINO EM ANDAMENTO</Label>
                <Text style={s.cardTitle}>{draft?.routineName}</Text>
              </View>
              <Text style={s.timer}>
                {draft
                  ? clock(
                      Math.max(0, (tick - Date.parse(draft.startedAt)) / 1000),
                    )
                  : "00:00"}
              </Text>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
            >
              <View style={s.rowBetween}>
                <Text style={s.bodyMuted}>
                  {draft?.sets.filter((x) => x.completed).length} /{" "}
                  {draft?.sets.length} séries
                </Text>
                <Text style={s.reward}>DISCIPLINA EM AÇÃO</Text>
              </View>
              <View style={{ marginTop: 14 }}>
                <Progress
                  value={
                    draft?.sets.length
                      ? draft.sets.filter((x) => x.completed).length /
                        draft.sets.length
                      : 0
                  }
                />
              </View>
              {restUntil > tick && (
                <View style={s.restBar}>
                  <Icon name="time-outline" />
                  <Text style={[s.body, { flex: 1 }]}>
                    Descanso · {clock((restUntil - tick) / 1000)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRestUntil(0)}
                  >
                    <Text style={s.link}>Pular</Text>
                  </Pressable>
                </View>
              )}
              {Array.from(new Set(draft?.sets.map((x) => x.exerciseId))).map(
                (exId) => {
                  const exercise = draft?.sets.find(row => row.exerciseId === exId);
                  return (
                    <View key={exId} style={[s.card, { marginTop: 20 }]}>
                      <Label>{exercise?.muscleGroups.join(", ") || "Exercício"}</Label>
                      <Text style={s.cardTitle}>{exercise?.exerciseName ?? exId}</Text>
                      <View style={s.setHeader}>
                        <Text style={[s.meta, { width: 34 }]}>SÉRIE</Text>
                        <Text
                          style={[s.meta, { flex: 1, textAlign: "center" }]}
                        >
                          KG
                        </Text>
                        <Text
                          style={[s.meta, { flex: 1, textAlign: "center" }]}
                        >
                          REPS
                        </Text>
                        <Text
                          style={[s.meta, { width: 44, textAlign: "center" }]}
                        >
                          FEITO
                        </Text>
                      </View>
                      {draft?.sets.map((row, index) =>
                        row.exerciseId === exId ? (
                          <View
                            key={index}
                            style={[
                              s.setRow,
                              row.completed && { backgroundColor: "#202C25" },
                            ]}
                          >
                            <Text
                              style={[
                                s.body,
                                { width: 28, textAlign: "center" },
                              ]}
                            >
                              {
                                draft.sets
                                  .slice(0, index + 1)
                                  .filter((x) => x.exerciseId === exId).length
                              }
                            </Text>
                            <TextInput
                              accessibilityLabel={`Carga ${exercise?.exerciseName ?? exId} série ${draft.sets.slice(0, index + 1).filter((x) => x.exerciseId === exId).length}`}
                              style={s.setInput}
                              keyboardType="decimal-pad"
                              value={row.weight}
                              onChangeText={(v) =>
                                updateSet(index, "weight", v)
                              }
                              selectTextOnFocus
                              maxLength={7}
                            />
                            <TextInput
                              accessibilityLabel={`Repetições ${exercise?.exerciseName ?? exId} série ${draft.sets.slice(0, index + 1).filter((x) => x.exerciseId === exId).length}`}
                              style={s.setInput}
                              keyboardType="number-pad"
                              value={row.reps}
                              onChangeText={(v) => updateSet(index, "reps", v)}
                              selectTextOnFocus
                              maxLength={4}
                            />
                            <Pressable
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: row.completed }}
                              aria-checked={row.completed}
                              accessibilityLabel={`Concluir série ${index + 1}`}
                              onPress={() => toggleSet(index)}
                              style={[
                                s.check,
                                row.completed && {
                                  backgroundColor: C.gold,
                                  borderColor: C.gold,
                                },
                              ]}
                            >
                              <Icon
                                name="checkmark"
                                color={row.completed ? C.bg : C.muted}
                                size={20}
                              />
                            </Pressable>
                          </View>
                        ) : null,
                      )}
                      <Pressable
                        accessibilityRole="button"
                        disabled={(draft?.sets.length ?? 0) >= 100}
                        style={s.textButton}
                        onPress={() =>
                          setDraft((d) =>
                            d && exercise && d.sets.length < 100
                              ? {
                                  ...d,
                                  sets: [
                                    ...d.sets,
                                    {
                                      ...exercise,
                                      completed: false,
                                    },
                                  ],
                                }
                              : d,
                          )
                        }
                      >
                        <Text style={s.link}>+ Adicionar série</Text>
                      </Pressable>
                      {!draft?.sets.some(row => row.exerciseId === exId && row.completed) && <Pressable
                        accessibilityRole="button" accessibilityLabel={`Remover ${exercise?.exerciseName ?? exId} do treino`}
                        onPress={() => setDraft(d => d && ({...d, sets: d.sets.filter(row => row.exerciseId !== exId)}))}
                        style={s.textButton}><Text style={s.bodyMuted}>Remover exercício</Text></Pressable>}
                    </View>
                  );
                },
              )}
              {pickerOpen ? <ExercisePicker catalog={library} remaining={100 - (draft?.sets.length ?? 0)}
                onClose={() => setPickerOpen(false)} onAdd={exercise => {
                  setDraft(d => d && d.sets.length < 100 ? { ...d, sets: [...d.sets, draftSet(exercise)] } : d);
                  setFormError(""); setPickerOpen(false);
                }}/> : <Button title="Escolher exercício" secondary icon="add" disabled={(draft?.sets.length ?? 0) >= 100}
                  onPress={() => setPickerOpen(true)}/>}
              {!!formError && <Text style={s.errorText}>{formError}</Text>}
              <Button
                title="Concluir e salvar treino"
                icon="checkmark"
                onPress={finishWorkout}
              />
              <Pressable
                accessibilityRole="button"
                style={s.textButton}
                onPress={() => setCancelOpen(true)}
              >
                <Text style={s.bodyMuted}>Descartar treino</Text>
              </Pressable>
              <Text style={[s.meta, { textAlign: "center" }]}>
                Carga 0 kg para exercícios com peso corporal.
              </Text>
            </ScrollView>
            {cancelOpen && (
              <View style={s.confirmOverlay}>
                <View style={[s.card, { width: "90%", maxWidth: 400 }]}>
                  <Text style={s.cardTitle}>Descartar este treino?</Text>
                  <Text style={s.bodyMuted}>
                    As séries desta sessão não serão salvas.
                  </Text>
                  <Button
                    title="Continuar treinando"
                    onPress={() => setCancelOpen(false)}
                  />
                  <Button
                    title="Sim, descartar treino"
                    secondary
                    onPress={() => {
                      setDraft(null);
                      setWorkoutOpen(false);
                      setCancelOpen(false);
                      setRestUntil(0);
                    }}
                  />
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <Sheet
        visible={!!summary}
        title="Treino registrado"
        onClose={() => setSummary(null)}
      >
        <View style={s.summarySeal}>
          <ImperialMark size={90} />
        </View>
        <Text style={[s.title, { textAlign: "center" }]}>
          Honra conquistada.
        </Text>
        <Text style={[s.intro, { textAlign: "center" }]}>
          Suas séries já contam para o histórico e os objetivos.
        </Text>
        <View style={[s.metrics, { marginVertical: 28 }]}>
          <Metric
            value={`+${summary?.xp ?? 0}`}
            label="XP"
            icon="sparkles-outline"
          />
          <Metric
            value={String(summary?.sets ?? 0)}
            label="SÉRIES"
            icon="barbell-outline"
          />
          <Metric
            value={String(summary?.minutes ?? 0)}
            label="MINUTOS"
            icon="time-outline"
          />
        </View>
        <Text style={s.bodyMuted}>
          Limite de 240 XP por dia. Todos os treinos continuam no histórico após
          atingir esse limite; apenas sessões que concedem XP contam para os
          requisitos do arsenal.
        </Text>
        <Button
          title="Continuar minha cruzada"
          onPress={() => {
            setSummary(null);
            navigate("campaign");
          }}
          icon="arrow-forward"
        />
      </Sheet>
      <Sheet
        visible={!!selectedArmour}
        title="Arquivo do arsenal"
        onClose={() => setSelectedArmour(null)}
      >
        {selectedArmour && (
          <>
            <View
              style={{ alignItems: "center", height: 265, overflow: "hidden" }}
            >
              <ComicAvatar
                {...appearance}
                faction={faction}
                pattern={selectedArmour.pattern}
                armourId={selectedArmour.id}
                size={220}
                helmet
              />
            </View>
            <Text style={s.title}>{selectedArmour.name}</Text>
            <Text style={[s.intro, { marginVertical: 15 }]}>
              {selectedArmour.description}
            </Text>
            <View style={s.card}>
              <Label>REGISTRO DE LORE</Label>
              <Text style={[s.body, { marginTop: 8, lineHeight: 22 }]}>
                {selectedArmour.lore}
              </Text>
            </View>
            <Text style={[s.bodyMuted, { marginTop: 20 }]}>
              Requisitos do app: {format(selectedArmour.requiredXp)} XP
              {selectedArmour.requiredSessions
                ? ` e ${selectedArmour.requiredSessions} treinos que concedam XP`
                : ""}
              .
            </Text>
            {!canEquip(selectedArmour, state) && (
              <Text style={[s.meta, { marginTop: 10 }]}>
                Faltam{" "}
                {format(Math.max(0, selectedArmour.requiredXp - state.xp))} XP e{" "}
                {Math.max(
                  0,
                  selectedArmour.requiredSessions -
                    getMeritoriousSessions(state),
                )}{" "}
                treinos com XP.
              </Text>
            )}
            <Button
              title={
                selectedArmour.id === activeArmour.id
                  ? "Equipamento em uso"
                  : canEquip(selectedArmour, state)
                    ? "Equipar armadura"
                    : "Requisição bloqueada"
              }
              disabled={
                !canEquip(selectedArmour, state) ||
                selectedArmour.id === activeArmour.id
              }
              icon="shield-checkmark-outline"
              onPress={() => equip(selectedArmour)}
            />
          </>
        )}
      </Sheet>
      <Sheet
        visible={avatarOpen}
        fixedBody
        title="Personalizar avatar"
        onClose={() => setAvatarOpen(false)}
      >
        {avatarOpen && avatarDraft && (
          <AvatarEditor
            value={avatarDraft}
            faction={faction}
            armour={activeArmour}
            onChange={setAvatarDraft}
            onCancel={() => setAvatarOpen(false)}
            onSave={() => {
              if (profile) {
                setState((old) => old.profile ? {
                  ...old, profile: { ...old.profile, avatar: { ...avatarDraft, armourId: old.profile.avatar.armourId } },
                } : old);
              } else {
                setEnlistmentAvatars((old) => ({ ...old, [sex]: avatarDraft }));
              }
              setAvatarOpen(false);
              setToast("Aparência atualizada.");
            }}
          />
        )}
      </Sheet>
      <Sheet
        visible={historyOpen}
        title="Histórico de treinos"
        onClose={() => setHistoryOpen(false)}
      >
        {state.sessions.length ? (
          state.sessions
            .slice()
            .reverse()
            .map((session) => (
              <View style={[s.card, { marginBottom: 15 }]} key={session.id}>
                <Label>
                  {new Date(session.endedAt).toLocaleDateString("pt-BR")}
                </Label>
                <Text style={s.cardTitle}>{session.routineName}</Text>
                <Text style={[s.reward, { marginVertical: 10 }]}>
                  +{session.xp} XP · {session.sets.length} {session.sets.length === 1 ? "série concluída" : "séries concluídas"}
                </Text>
                {session.sets.map((set, i) => (
                  <View key={i} style={s.historySet}>
                    <Text style={[s.meta, { flex: 1 }]}>
                      {set.exerciseName ?? library.find((e) => e.id === set.exerciseId)?.name ??
                        set.exerciseId}
                    </Text>
                    <Text style={s.body}>
                      {set.reps} × {format(set.weight)} kg
                    </Text>
                  </View>
                ))}
              </View>
            ))
        ) : (
          <Text style={s.bodyMuted}>Nenhum treino registrado ainda.</Text>
        )}
      </Sheet>
      <Sheet
        visible={builderOpen}
        title="Criar rotina"
        onClose={() => setBuilderOpen(false)}
      >
        <Label>NOME DA ROTINA</Label>
        <TextInput
          accessibilityLabel="Nome da rotina"
          style={s.input}
          placeholder="Ex.: Treino de segunda"
          placeholderTextColor={C.muted}
          maxLength={45}
          value={routineName}
          onChangeText={setRoutineName}
        />
        {chosenExercises.map(e => <View key={e.id} style={s.campaignMission}>
          <View style={{flex: 1}}><Text style={s.body}>{e.name}</Text><Text style={s.meta}>
            {e.reps ? `${e.sets} × ${e.reps}` : `${e.sets} ${e.sets === 1 ? "série" : "séries"}`}{e.muscle ? ` · ${e.muscle}` : ""}
          </Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${e.name}`} style={s.iconButton}
            onPress={() => setChosenExercises(old => old.filter(item => item.id !== e.id))}><Icon name="close" /></Pressable>
        </View>)}
        {routinePickerOpen ? <ExercisePicker routine catalog={library} remaining={100 - chosenExercises.reduce((n,e) => n + e.sets, 0)}
          onClose={() => setRoutinePickerOpen(false)} onAdd={exercise => {
            setChosenExercises(old => [...old.filter(item => item.id !== exercise.id), exercise]);
            setFormError(""); setRoutinePickerOpen(false);
          }}/> : <Button title="Escolher exercício" secondary icon="add" onPress={() => setRoutinePickerOpen(true)}/>}
        {!!formError && <Text style={s.errorText}>{formError}</Text>}
        <Button title="Salvar rotina" onPress={saveRoutine} />
      </Sheet>
      <Sheet
        visible={settingsOpen}
        title="Configurações"
        onClose={() => setSettingsOpen(false)}
      >
        <Label>NOME DO PERFIL</Label>
        <TextInput
          accessibilityLabel="Nome do perfil"
          value={name}
          onChangeText={setName}
          maxLength={32}
          style={s.input}
        />
        <Button
          title="Salvar nome"
          disabled={!name.trim()}
          onPress={() => {
            setState((old) => ({
              ...old,
              profile: old.profile
                ? { ...old.profile, name: name.trim() }
                : null,
            }));
            setSettingsOpen(false);
          }}
        />
        <View style={[s.card, { marginTop: 22 }]}>
          <Label>SUA CAMPANHA</Label>
          <Text style={s.cardTitle}>
            {faction === "astartes" ? "Adeptus Astartes" : "Adepta Sororitas"}
          </Text>
          <Text style={s.bodyMuted}>
            O caminho foi definido no alistamento. Seus registros e sua
            aparência ficam salvos neste aparelho.
          </Text>
        </View>
        <Button
          secondary
          title={state.equipmentTesting ? "Encerrar teste de trajes" : "Liberar trajes para teste"}
          icon="shirt-outline"
          onPress={() => setState(old => hydrateState(JSON.stringify({ ...old, equipmentTesting: !old.equipmentTesting })))}
        />
        <Button
          secondary
          title="Lore e créditos"
          icon="book-outline"
          onPress={() => {
            setSettingsOpen(false);
            setLoreOpen(true);
          }}
        />
      </Sheet>
      <Sheet
        visible={loreOpen}
        title="Biblioteca do Imperium"
        onClose={() => setLoreOpen(false)}
      >
        <Label>LORE & ADAPTAÇÃO</Label>
        <Text style={[s.body, { lineHeight: 23, marginTop: 14 }]}>
          XP, desbloqueios e a campanha de treino são regras deste app. Não são
          uma tabela canônica de promoções.
        </Text>
        {[
          [
            "Padrões Astartes",
            "Mk III é um padrão histórico, não uma patente superior a Mk VII ou Mk X. A alternância entre Mk X Primaris e Mk III no mesmo avatar é uma simplificação visual.",
            "https://www.warhammer-community.com/en-gb/articles/GiwsJS6T/power-armour-through-the-ages/",
          ],
          [
            "Honra Terminator",
            "A armadura Terminator é associada à elite veterana. Aqui, a veterania e os treinos representam a conquista simbólica dessa honra.",
            "https://www.warhammer-community.com/en-gb/articles/wr9feecy/assault-terminators-are-an-unstoppable-force-and-an-immovable-object-in-one-indomitable-package/",
          ],
          [
            "Caminho Sororitas",
            "As noviças ainda precisam conquistar power armour. As Sororitas são humanas e usam equipamentos próprios. Celestian é uma função de elite; Canoness é um posto de comando.",
            "https://warcomprod2024productionstorage.s3.eu-west-2.amazonaws.com/rules-downloads/kill-team/team-rules/novitiates/killteam_teamrules_novitiates_eng_02.10.24.pdf",
          ],
        ].map(([title, body, url]) => (
          <View key={title} style={[s.card, { marginTop: 15 }]}>
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={[s.bodyMuted, { lineHeight: 22 }]}>{body}</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                Linking.openURL(url).catch(() =>
                  setToast("Não foi possível abrir o navegador."),
                )
              }
              style={s.textButton}
            >
              <Text style={s.link}>Consultar fonte oficial ↗</Text>
            </Pressable>
          </View>
        ))}
        <Text style={[s.bodyMuted, { marginTop: 22 }]}>
          Ilustrações vetoriais originais e estilizadas para o protótipo. Não
          representam modelos oficiais de miniaturas. Projeto de fã, sem
          afiliação oficial.
        </Text>
        <Text style={[s.meta, { marginTop: 15 }]}>
          Lore consultada em 6 de novembro de 2026.
        </Text>
      </Sheet>
    </View>
  );
}
