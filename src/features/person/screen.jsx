'use client';
import { Screen } from '@/components/screen';
import { View } from './view';
import { initialize } from './controller';
export default function FeatureScreen() {
  return <Screen name="person" View={View} initialize={initialize} />;
}
