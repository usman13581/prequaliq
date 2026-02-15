import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateOnlyPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  minDate?: string; // YYYY-MM-DD
  placeholder?: string;
  id?: string;
  className?: string;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Date-only picker with a good-looking calendar. Value is always YYYY-MM-DD.
 */
export const DateOnlyPicker: React.FC<DateOnlyPickerProps> = ({
  value,
  onChange,
  minDate,
  placeholder = 'Select date',
  id,
  className = '',
  error = false,
  required = false,
  disabled = false
}) => {
  const selected = value ? new Date(value + 'T12:00:00') : null;
  const min = minDate ? new Date(minDate + 'T12:00:00') : undefined;

  const handleChange = (date: Date | null) => {
    if (!date) {
      onChange('');
      return;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };

  const baseClass = `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'} ${className}`;

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={handleChange}
      minDate={min}
      dateFormat="yyyy-MM-dd"
      placeholderText={placeholder}
      className={baseClass}
      required={required}
      disabled={disabled}
      showTimeSelect={false}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      calendarClassName="date-only-picker-calendar"
      popperClassName="date-only-picker-popper"
    />
  );
};
