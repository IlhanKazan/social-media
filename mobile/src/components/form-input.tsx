import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useState } from 'react';
import { Text, TextInput, TextInputProps } from 'react-native';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  error?: string;
} & TextInputProps;

export function FormInput<T extends FieldValues>({ control, name, error, ...inputProps }: Props<T>) {
  const [focused, setFocused] = useState(false);

  return (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`mt-3 rounded-xl border px-4 py-3 text-[15px] text-neutral-900 dark:text-neutral-50 ${
              error
                ? 'border-red-500'
                : focused
                  ? 'border-primary'
                  : 'border-neutral-300 dark:border-neutral-700'
            }`}
            placeholderTextColor="#71767b"
            onBlur={() => {
              setFocused(false);
              onBlur();
            }}
            onFocus={() => setFocused(true)}
            onChangeText={onChange}
            value={value}
            {...inputProps}
          />
        )}
      />
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </>
  );
}
