// src/app.mu — your application UI. Edit freely; it is never regenerated.
// The view-model class lives in ./main.ts; bind to its members with $Name.
import TestArchApp from "./main.js"

Application
{
    resources:
    {
        ContentPresenter x:root [ Content = $service(TestArchApp) ]

        DataTemplate [ DataType = TestArchApp ]
        {
            StackPanel [ Orientation = Vertical, Margin = (16,16,16,16) ]
            {
                TextBlock [ Text = $HelloText ]
                TextBlock [ Text = $ConceptSummary ]
            }
        }
    }
}
