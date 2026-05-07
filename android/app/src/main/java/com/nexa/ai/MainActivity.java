package com.nexa.ai;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Habilitar modo Edge-to-Edge para que la app se dibuje detrás de las barras del sistema
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
