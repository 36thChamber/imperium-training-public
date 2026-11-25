import React, { type ComponentProps, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, s } from './styles';
import { Scanlines, ScreenNoise } from './components/Cogitator';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color = C.phosphor }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} accessible={false} />;
}

export function Button({ title, onPress, secondary = false, icon, disabled = false, testID }: {
  title: string; onPress: () => void; secondary?: boolean; icon?: IconName; disabled?: boolean; testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      style={({ pressed }) => [s.button, secondary && s.secondary, disabled && { opacity: 0.38 }, pressed && !disabled && { opacity: 0.78 }]}
    >
      <ScreenNoise opacity={secondary ? 0.06 : 0.13}/>
      <View pointerEvents="none" style={[decor.buttonRail,{left:4,borderColor:secondary?'#637F45':'#48612B'}]}/>
      <View pointerEvents="none" style={[decor.buttonRail,{right:4,borderColor:secondary?'#637F45':'#48612B'}]}/>
      {icon && <Icon name={icon} size={17} color={secondary ? C.phosphor : '#121D0A'} />}
      <Text style={[s.buttonText, secondary && { color: C.phosphor }]}>{title}</Text>
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={s.section}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,flex:1}}><View accessible={false} style={decor.sectionStud}/><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text></View>
      {action && <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={action} style={s.textButton}>
        <View style={s.row}><Text style={s.link}>{action}</Text><Icon name="chevron-forward" size={12} /></View>
      </Pressable>}
    </View>
  );
}

export function Progress({ value }: { value: number }) {
  const progress = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return <View style={s.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
    <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
  </View>;
}

export function Metric({ value, label, icon }: { value: string | number; label: string; icon: IconName }) {
  return <View style={s.metric} accessible accessibilityLabel={`${label}: ${value}`}>
    <Scanlines opacity={0.06}/><View pointerEvents="none" style={decor.metricNotch}/>
    <Icon name={icon} size={16} color={C.terminal}/>
    <Text style={s.metricValue}>{value}</Text>
    <Text style={s.metricLabel}>{label}</Text>
  </View>;
}

export function Sheet({ visible, title, onClose, children, fixedBody = false }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode; fixedBody?: boolean;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="overFullScreen" statusBarTranslucent>
      <KeyboardAvoidingView style={s.modalBack} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View style={[s.sheet, fixedBody && { height: '93%' }]} accessibilityViewIsModal>
          <View style={{ height: 3, width: 42, borderWidth:1,borderTopColor:'#889561',borderBottomColor:'#202E15',backgroundColor:'#53693A',alignSelf:'center',marginTop:9,marginBottom:4 }} />
          <View style={s.sheetHeader}>
            <View accessible={false} style={decor.sectionStud}/><Text accessibilityRole="header" style={[s.sectionTitle, { flex: 1 }]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={s.iconButton}>
              <Icon name="close" color={C.muted} size={23} />
            </Pressable>
          </View>
          {fixedBody ? children : <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40, gap: 14 }}>
            {children}
          </ScrollView>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const decor=StyleSheet.create({
 buttonRail:{position:'absolute',height:22,width:3,borderWidth:1,opacity:.65},
 sectionStud:{width:4,height:13,backgroundColor:C.terminal,borderWidth:1,borderTopColor:'#BBCE8B',borderLeftColor:'#667A4A',borderRightColor:'#263A18',borderBottomColor:'#263A18'},
 metricNotch:{position:'absolute',left:7,right:7,top:5,height:1,backgroundColor:'#5F7542',opacity:.5},
});
