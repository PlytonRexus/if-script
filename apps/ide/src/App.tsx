import { Navigate, Route, Routes } from 'react-router-dom'
import { IdePage } from './routes/IdePage'

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<IdePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
