'use client';
import { Screen } from '@/components/screen';
import { View } from './view';
import { initialize } from './controller';
export default function FeatureScreen() {
  return <Screen name="onboarding" View={View} initialize={initialize} />;
}
