'use client';
import { Screen } from '@/components/screen';
import { View } from './view';
import { initialize } from './controller';
export default function FeatureScreen() {
  return <Screen name="calendar" View={View} initialize={initialize} />;
}
