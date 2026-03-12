import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kiomvawbigcepjiwpmdi.supabase.co' 
const supabaseKey = 'sb_publishable_pcbLwWiOXQIFSAK4p3myow_nmAHXvYp' 

export const supabase = createClient(supabaseUrl, supabaseKey)